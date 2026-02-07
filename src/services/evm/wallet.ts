import { BaseWallet } from "../base/index";
import { DexConfig } from "../../types";
import { BigNumber } from "@okxweb3/crypto-lib";
import { EthWallet as EthWalletOkx } from "@okxweb3/coin-ethereum";
import { GenerateWalletPayload, TokenInfo, IResponse } from "./../../types";
import { successResponse, formatAmount, parseAmount, parseGwei, formatGwei, formatEther, parseEther } from "./../../utils";
import { GetContract, BalancePayload, TransferPayload, GetTransactionPayload, ISmartContractCallPayload, SignerPayload, GetErcTokenInfoPayload, estimateGasPayload } from "./types";
import { ethers } from "ethers";
import erc20Abi from "./abi/erc20.json";

const provider = (rpcUrl?: string) => new ethers.JsonRpcProvider(rpcUrl);

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

        const providerInstance = provider(rpcUrl ?? this.config.rpcUrl);
        const gasFeeData = await providerInstance.getFeeData();

        let nonce, contract, signer;


        if (privateKey) {
            signer = new ethers.Wallet(privateKey, providerInstance);
            nonce = await providerInstance.getTransactionCount(
                await signer.getAddress(),
                "pending"
            );
        }

        if (contractAddress) {
            contract = new ethers.Contract(
                contractAddress,
                abi || erc20Abi,
                signer || providerInstance
            );

            const code = await providerInstance.getCode(contractAddress);
            if (code === "0x") {
                throw new Error("Address is not a contract");
            }
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
            return successResponse({
                balance: formatAmount(balance.toString(), decimals),
                _rawBalance: balance.toString(),
                _decimal: decimals,
            });
        }

        const balance = await providerInstance.getBalance(address);

        return successResponse({
            balance: formatAmount(balance.toString(), 18),
            _rawBalance: balance.toString(),
            _decimal: 18,
        });
    }

    async transfer({ privateKey, contractAddress, rpcUrl, ...args }: TransferPayload): Promise<IResponse> {
        const { contract, providerInstance, gasFeeData, nonce } = await this.getContract({
            rpcUrl: rpcUrl ?? this.config.rpcUrl,
            privateKey,
            contractAddress,
        });

        const recipientAddress = await this.wallet.validAddress({ address: args.recipientAddress });
        if (!recipientAddress.isValid) throw new Error("address not valid");

        // VALIDASI FEE
        if (args.maxPriorityFeePerGas && args.maxFeePerGas) {
            const prio = BigInt(args.maxPriorityFeePerGas);
            const max = BigInt(args.maxFeePerGas);
            if (max < prio) {
                throw new Error("maxFeePerGas must be >= maxPriorityFeePerGas");
            }
        }

        if (args.gasPrice && (args.maxFeePerGas || args.maxPriorityFeePerGas)) {
            throw new Error("Cannot use gasPrice with EIP-1559 fee fields");
        }

        let value: bigint;
        let gasLimit: bigint;

        if (contractAddress) {
            if (!contract) throw new Error("contract not valid");

            const decimals = await contract.decimals();
            value = parseAmount(args.amount.toString(), decimals);


            gasLimit = args.gasLimit
                ? BigInt(args.gasLimit)
                : await contract.transfer.estimateGas(
                    args.recipientAddress,
                    value
                );
        } else {
            value = parseEther(args.amount.toString());
            gasLimit = args.gasLimit ? BigInt(args.gasLimit) : 21000n;
        }

        // DEFAULT FEE
        const noFeeProvided =
            !args.gasPrice &&
            !args.maxFeePerGas &&
            !args.maxPriorityFeePerGas;

        if (noFeeProvided) {
            const estimate = await this.estimateGas({
                rpcUrl: rpcUrl ?? this.config.rpcUrl,
                recipientAddress: args.recipientAddress,
                amount: args.amount.toString(),
                data: args.data,
            });

            gasLimit = BigInt(estimate.gasLimit);

            // ===== LEGACY =====
            if (estimate.model === "LEGACY") {
                if (!estimate.gasPrice) {
                    throw new Error("LEGACY estimate missing gasPrice");
                }

                args.gasPrice = estimate.gasPrice; // wei
                return this.transfer({ privateKey, contractAddress, rpcUrl, ...args });
            }

            // ===== EIP-1559 =====
            const fee = estimate.fees.regular;

            if (!fee?.maxFeePerGas || !fee?.maxPriorityFeePerGas) {
                throw new Error("EIP1559 estimate missing fee fields");
            }

            args.maxFeePerGas = fee.maxFeePerGas;
            args.maxPriorityFeePerGas = fee.maxPriorityFeePerGas;
        }

        // ===============================
        // SIGN & BROADCAST
        // ===============================
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

    async getTransaction({ hash, rpcUrl, withReceipt }: GetTransactionPayload): Promise<IResponse> {
        const { providerInstance } = await this.getContract({ rpcUrl: rpcUrl ?? this.config.rpcUrl });

        try {
            if (withReceipt) {
                const [tx, receipt] = await Promise.all([
                    providerInstance.getTransaction(hash),
                    providerInstance.getTransactionReceipt(hash),
                ]);

                const memo = tx?.data && tx.data !== "0x"
                    ? ethers.toUtf8String(tx.data)
                    : null;

                return successResponse({
                    transaction: tx,
                    receipt,
                    memo,
                });
            }

            const tx = await providerInstance.getTransaction(hash);

            return successResponse({
                transaction: tx,
            });
        } catch (error) {
            throw error;
        }
    }

    async getTokenInfo({ contractAddress, rpcUrl }: GetErcTokenInfoPayload): Promise<IResponse> {
        const { contract } = await this.getContract({ contractAddress, rpcUrl: rpcUrl ?? this.config.rpcUrl, });

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
                totalSupply: formatAmount(totalSupply.toString(), decimals).toString(),

            };
            return successResponse({ ...data });
        }

        throw new Error('Contract not found');
    };

    async smartContractCall(args: ISmartContractCallPayload): Promise<IResponse> {
        const { contract, gasFeeData, nonce } = await this.getContract({
            rpcUrl: args.rpcUrl ?? this.config.rpcUrl,
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
                        ? parseGwei(args.gasPrice)
                        : gasFeeData?.gasPrice,

                    nonce: args.nonce || nonce,
                    value: args.value ? parseEther(args.value.toString()) : 0,
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

    async estimateGas({ rpcUrl, recipientAddress, amount, data }: estimateGasPayload): Promise<IResponse> {
        const { providerInstance } = await this.getContract({ rpcUrl: rpcUrl ?? this.config.rpcUrl });

        try {

            const network = await providerInstance.getNetwork();
            const chainId = Number(network.chainId);

            const tx = {
                to: recipientAddress,
                value: parseEther(amount.toString()),
                data: data
                    ? ethers.hexlify(ethers.toUtf8Bytes(data as string))
                    : '0x',
            };

            const [feeData, gasLimit] = await Promise.all([
                providerInstance.getFeeData(),
                providerInstance.estimateGas(tx),
            ]);

            const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = feeData;

            const applyMultiplier = (base: bigint, mul: number) =>
                (base * BigInt(Math.floor(mul * 10))) / 10n;

            // feeData IS AUTO CHECK EIP OR LEGACY
            const isEip1559 = maxFeePerGas !== null && maxPriorityFeePerGas !== null;

            if (!isEip1559) {
                const baseGasPrice = BigInt(gasPrice ?? 0n);

                const regularGasPrice = baseGasPrice; // wallet "slow"
                const expressGasPrice = (baseGasPrice * 110n) / 100n; // +10%
                const instantGasPrice = (baseGasPrice * 125n) / 100n; // +25%

                const regularFee = gasLimit * regularGasPrice;
                const expressFee = gasLimit * expressGasPrice;
                const instantFee = gasLimit * instantGasPrice;

                return successResponse({
                    chainId,
                    gasLimit: gasLimit.toString(),
                    gasPrice: baseGasPrice.toString(),
                    gasPriceGwei: formatGwei(baseGasPrice),
                    model: "LEGACY",
                    fees: {
                        regular: formatEther(regularFee),
                        express: formatEther(expressFee),
                        instant: formatEther(instantFee),
                    }
                });
            }

            let baseFee: bigint;
            let priorityFee: bigint;

            const block = await providerInstance.getBlock("latest");

            baseFee = BigInt(block!.baseFeePerGas ?? 0n);
            priorityFee = BigInt(
                feeData.maxPriorityFeePerGas ?? parseGwei(DEFAULT_PRIORITY)
            );

            const regularPriority = priorityFee;
            const regularMaxFee = baseFee + regularPriority;

            const expressPriority = applyMultiplier(priorityFee, 1.2);
            const expressMaxFee = applyMultiplier(baseFee, 1.2) + expressPriority;

            const instantPriority = applyMultiplier(priorityFee, 1.5);
            const instantMaxFee = applyMultiplier(baseFee, 1.5) + instantPriority;

            const MAX_GAS_GWEI = 100n * 1_000_000_000n;
            const cap = (v: bigint) => (v > MAX_GAS_GWEI ? MAX_GAS_GWEI : v);

            const regularFee = gasLimit * cap(regularMaxFee);
            const expressFee = gasLimit * cap(expressMaxFee);
            const instantFee = gasLimit * cap(instantMaxFee);

            return successResponse({
                chainId,
                gasLimit: gasLimit.toString(),
                baseFeeGwei: formatGwei(baseFee),
                priorityFeeGwei: formatGwei(priorityFee),
                model: "EIP1559",
                fees: {
                    regular: {
                        perCoin: formatEther(regularFee),
                        maxPriorityFeePerGas: regularPriority.toString(),
                        maxFeePerGas: regularMaxFee.toString(),
                    },
                    express: {
                        perCoin: formatEther(expressFee),
                        maxPriorityFeePerGas: expressPriority.toString(),
                        maxFeePerGas: expressMaxFee.toString(),
                    },
                    instant: {
                        perCoin: formatEther(instantFee),
                        maxPriorityFeePerGas: instantPriority.toString(),
                        maxFeePerGas: instantMaxFee.toString(),
                    },
                }
            });

        } catch (error) {
            throw error;
        }
    }

    private async buildSignParams({ args, nonce, gasFeeData, recipientAddress, value, contractAddress }: SignerPayload) {
        const txBase = {
            to: recipientAddress.address,
            value: BigNumber(value.toString()),
            data: args.data
                ? ethers.hexlify(ethers.toUtf8Bytes(args.data as string))
                : '0x',
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
                    gasPrice: BigNumber(parseGwei(args.gasPrice).toString()),
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
                    args.maxPriorityFeePerGas
                        ? args.maxPriorityFeePerGas
                        : gasFeeData.maxPriorityFeePerGas!.toString()
                ),
                maxFeePerGas: BigNumber(
                    args.maxFeePerGas
                        ? args.maxFeePerGas
                        : gasFeeData.maxFeePerGas!.toString()
                ),
            },
        };
    }
}
