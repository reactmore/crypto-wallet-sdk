import { BaseWallet } from "../base/index";
import { DexConfig } from "../../types";
import { BigNumber } from "@okxweb3/crypto-lib";
import { EthWallet as EthWalletOkx } from "@okxweb3/coin-ethereum";
import { GenerateWalletPayload, TokenInfo, IResponse } from "./../../types";
import { GetContract, BalancePayload, TransferPayload, ISmartContractCallPayload, SignerPayload, GetErcTokenInfoPayload } from "./types";
import { ethers } from "ethers";
import erc20Abi from "./abi/erc20.json";

const provider = (rpcUrl?: string) => new ethers.JsonRpcProvider(rpcUrl);

const successResponse = (args: IResponse): IResponse => args;

const DEFAULT_PRIORITY = "0.1";
const DEFAULT_MAXFEE = "3";

export class EvmWallet extends BaseWallet {
    private wallet: EthWalletOkx;
    constructor(config: DexConfig) {
        super(config)
        this.wallet = new EthWalletOkx();
    }

    async getContract({ contractAddress, rpcUrl, privateKey, abi }: GetContract) {
        if (!rpcUrl) throw new Error("RPC URL is required");

        const providerInstance = provider(rpcUrl);
        const gasFeeData = await providerInstance.getFeeData();

        let nonce, contract, signer;
        const contractAbi = abi || erc20Abi;

        if (privateKey) {
            signer = new ethers.Wallet(privateKey, providerInstance);
            nonce = await providerInstance.getTransactionCount(await signer.getAddress());
        }

        if (contractAddress) {
            contract = new ethers.Contract(contractAddress, contractAbi, signer || providerInstance);
        }

        return { contract, signer, gasFeeData, nonce, providerInstance };
    }

    async generateWallet({ mnemonic, derivationPath }: GenerateWalletPayload): Promise<IResponse> {
        const hdPath = derivationPath || "m/44'/60'/0'/0/0";
        const getMnemonic = mnemonic ?? (await this.generateMnemonic(12));

        const derivePrivateKey = await this.wallet.getDerivedPrivateKey({ mnemonic: getMnemonic, hdPath });
        const { address, publicKey } = await this.wallet.getNewAddress({ privateKey: derivePrivateKey });

        return successResponse({ address, publicKey, privateKey: derivePrivateKey });
    }

    async getBalance({ rpcUrl, contractAddress, address }: BalancePayload): Promise<IResponse> {
        const { contract, providerInstance } = await this.getContract({ rpcUrl: rpcUrl ?? this.config.rpcUrl, contractAddress });

        if (contract) {
            const decimals = await contract.decimals();
            const balance = await contract.balanceOf(address);
            return successResponse({ balance: parseFloat(ethers.formatUnits(balance, decimals)) });
        }

        const balance = await providerInstance.getBalance(address);
        return successResponse({ balance: parseFloat(ethers.formatEther(balance)) });
    }

    async transfer({ privateKey, contractAddress, rpcUrl, ...args }: TransferPayload): Promise<IResponse> {
        const { contract, providerInstance, gasFeeData, nonce } = await this.getContract({
            rpcUrl,
            privateKey,
            contractAddress,
        });

        const recipientAddress = await this.wallet.validAddress({ address: args.recipientAddress });
        if (!recipientAddress.isValid) throw new Error("address not valid");

        // validasi fee manual
        if (args.maxPriorityFeePerGas && args.maxFeePerGas) {
            const prio = ethers.parseUnits(args.maxPriorityFeePerGas, "gwei");
            const max = ethers.parseUnits(args.maxFeePerGas, "gwei");
            if (max < prio) {
                throw new Error(
                    `Invalid fee config: maxFeePerGas (${args.maxFeePerGas} gwei) must be >= maxPriorityFeePerGas (${args.maxPriorityFeePerGas} gwei)`
                );
            }
        }

        let value: bigint | string;
        let gasLimit: bigint;

        if (contractAddress) {
            if (!contract) throw new Error("contract not valid");

            const decimals = await contract.decimals();
            value = ethers.parseUnits(args.amount.toString(), decimals);

            gasLimit = args.gasLimit ? BigInt(args.gasLimit)
                : await contract.transfer.estimateGas(
                    args.recipientAddress,
                    value
                );
        } else {
            value = ethers.parseEther(args.amount.toString());
            gasLimit = args.gasLimit ? BigInt(args.gasLimit) : BigInt(21000);
        }

        const signParams = await this.buildSignParams({
            args: { ...args, privateKey, gasLimit },
            nonce,
            gasFeeData,
            recipientAddress,
            value,
            contractAddress,
        });

        const signedTx = await this.wallet.signTransaction(signParams);
        const broadcast = await providerInstance.broadcastTransaction(signedTx);

        return successResponse({ ...broadcast });
    }

    async getTokenInfo({ contractAddress, rpcUrl }: GetErcTokenInfoPayload): Promise<IResponse> {
        const { contract } = await this.getContract({ contractAddress, rpcUrl });

        if (contract) {
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals(),
                contract.totalSupply(),
            ]);

            const data: TokenInfo = {
                name,
                symbol,
                decimals,
                totalSupply: ethers.formatUnits(totalSupply, decimals).toString(),
            };
            return successResponse({ ...data });
        }

        throw new Error('Contract not found');
    };

    async smartContractCall(args: ISmartContractCallPayload): Promise<IResponse> {
        const { contract, gasFeeData, nonce } = await this.getContract({
            rpcUrl: args.rpcUrl,
            contractAddress: args.contractAddress,
            abi: args.contractAbi,
            privateKey: args.privateKey,
        });

        try {
            let tx;
            let overrides = {} as any;

            if (args.methodType === 'read') {
                overrides = {};
            } else if (args.methodType === 'write') {
                overrides = {
                    gasPrice: args.gasPrice
                        ? ethers.parseUnits(args.gasPrice, 'gwei')
                        : gasFeeData.gasPrice,
                    nonce: args.nonce || nonce,
                    value: args.value ? ethers.parseEther(args.value.toString()) : 0,
                };

                if (args.gasLimit) {
                    overrides.gasLimit = args.gasLimit;
                }
            }

            if (args.params.length > 0) {
                tx = await contract?.[args.method](...args.params, overrides);
            } else {
                tx = await contract?.[args.method](overrides);
            }

            return successResponse({
                data: tx,
            });
        } catch (error) {
            throw error;
        }
    };

    private async buildSignParams({ args, nonce, gasFeeData, recipientAddress, value, contractAddress }: SignerPayload) {
        const txBase = {
            to: recipientAddress.address,
            value: BigNumber(value.toString()),
            nonce: args.nonce || (await nonce),
            gasLimit: args.gasLimit ? BigNumber(args.gasLimit) : BigNumber(21000),
            chainId: Number(this.currentChain.id),
            ...(contractAddress ? { contractAddress } : {}),
        };

        // legacy vs eip-1559
        if (args.gasPrice) {
            return {
                privateKey: args.privateKey,
                data: {
                    ...txBase,
                    gasPrice: BigNumber(ethers.parseUnits(args.gasPrice.toString(), "gwei").toString()),
                    type: 0,
                },
            };
        }

        return {
            privateKey: args.privateKey,
            data: {
                ...txBase,
                type: 2,
                maxPriorityFeePerGas: BigNumber(
                    (
                        args.maxPriorityFeePerGas
                            ? ethers.parseUnits(args.maxPriorityFeePerGas, "gwei")
                            : gasFeeData.maxPriorityFeePerGas ?? ethers.parseUnits(DEFAULT_PRIORITY, "gwei")
                    ).toString()
                ),
                maxFeePerGas: BigNumber(
                    (
                        args.maxFeePerGas
                            ? ethers.parseUnits(args.maxFeePerGas.toString(), "gwei")
                            : gasFeeData.maxFeePerGas ?? ethers.parseUnits(DEFAULT_MAXFEE, "gwei")
                    ).toString()
                ),
            },
        };
    }

}
