import { bip39, BigNumber } from "@okxweb3/crypto-lib";
import { EthWallet as EthWalletOkx } from '@okxweb3/coin-ethereum';
import { GenerateWalletPayload, BalancePayload, TransferPayload, GetContract } from './types';
import { ethers } from 'ethers';
import erc20Abi from './Abi/erc20.json';


interface IResponse {
    [key: string]: any;
}



const provider = (rpcUrl?: string) => {
    return new ethers.JsonRpcProvider(rpcUrl);
};

const successResponse = (args: IResponse): IResponse => {
    return args;
};


export class EthWallet {
    private wallet: EthWalletOkx;

    constructor() {
        this.wallet = new EthWalletOkx();
    }

    async getContract({ contractAddress, rpcUrl, privateKey, abi }: GetContract) {
        if (!rpcUrl) {
            throw new Error('RPC URL is required');
        }

        const providerInstance = provider(rpcUrl);
        const gasFeeData = await providerInstance.getFeeData();
        const gasPrice = gasFeeData.gasPrice;
        const gas = BigInt("21000");

        let nonce;
        let contract;
        let signer;
        const contractAbi = abi || erc20Abi;

        if (privateKey && contractAddress) {
            signer = new ethers.Wallet(privateKey, providerInstance);
            nonce = providerInstance.getTransactionCount(signer.getAddress());
            contract = new ethers.Contract(contractAddress, contractAbi, signer);
        } else if (privateKey && !contractAddress) {
            signer = new ethers.Wallet(privateKey, providerInstance);
            nonce = providerInstance.getTransactionCount(signer.getAddress());
        } else if (contractAddress && !privateKey) {
            contract = new ethers.Contract(
                contractAddress,
                contractAbi,
                providerInstance
            );
        }

        return {
            contract,
            signer,
            gasPrice,
            gas,
            gasFeeData,
            nonce,
            providerInstance,
        };
    };

    async generateMnemonic(numWords: number = 12): Promise<string> {
        const strength = (numWords / 3) * 32;
        return bip39.generateMnemonic(strength);
    }

    async generateWallet({ mnemonic, derivationPath }: GenerateWalletPayload): Promise<Object> {
        const hdPath = derivationPath || "m/44'/60'/0'/0/0";
        const getMnemonic = mnemonic ?? (await this.generateMnemonic(12));

        const derivePrivateKey = await this.wallet.getDerivedPrivateKey({
            mnemonic: getMnemonic,
            hdPath
        });

        const { address, publicKey } = await this.wallet.getNewAddress({ privateKey: derivePrivateKey });

        return successResponse({
            address,
            publicKey,
            privateKey: derivePrivateKey
        })
    }

    async getBalance({ rpcUrl, contractAddress, address }: BalancePayload): Promise<IResponse> {
        const { contract, providerInstance } = await this.getContract({ rpcUrl, contractAddress });

        try {
            let balance;
            if (contract) {
                const decimals = await contract.decimals();
                balance = await contract.balanceOf(address);
                return successResponse({
                    balance: parseFloat(ethers.formatUnits(balance, decimals)),
                });
            }

            balance = await providerInstance.getBalance(address);

            return successResponse({
                balance: parseFloat(ethers.formatEther(balance)),
            });
        } catch (error) {
            throw error;
        }
    };

    async transfer({ privateKey, contractAddress, rpcUrl, ...args }: TransferPayload): Promise<IResponse> {
        const { contract, providerInstance, gasFeeData, nonce } = await this.getContract({ rpcUrl, privateKey, contractAddress });

        try {
            let recipientAddress = await this.wallet.validAddress({ address: args.recipientAddress });
            if (!recipientAddress.isValid) throw new Error('address not valid');

            if (args.maxPriorityFeePerGas && args.maxFeePerGas) {
                const prio = ethers.parseUnits(args.maxPriorityFeePerGas, "gwei");
                const max = ethers.parseUnits(args.maxFeePerGas, "gwei");

                if (max < prio) {
                    throw new Error(
                        `Invalid fee config: maxFeePerGas (${args.maxFeePerGas} gwei) must be >= maxPriorityFeePerGas (${args.maxPriorityFeePerGas} gwei)`
                    );
                }
            }

            let signParams;

            // ==== CASE: ERC20 TOKEN TRANSFER ====
            if (contractAddress) {
                if (!contract) throw new Error('contract not valid');

                const decimals = await contract.decimals();
                const estimatedGas = await contract.transfer.estimateGas(
                    args.recipientAddress,
                    ethers.parseUnits(args.amount.toString(), decimals)
                );

                signParams = {
                    privateKey,
                    data: {
                        contractAddress,
                        to: recipientAddress.address,
                        value: new BigNumber(ethers.parseUnits(args.amount.toString(), decimals).toString()),
                        nonce: args.nonce || await nonce,
                        gasLimit: args.gasLimit ? new BigNumber(args.gasLimit) : estimatedGas,
                        chainId: 11155111,
                        // Gunakan legacy kalau user set gasPrice
                        ...(args.gasPrice
                            ? {
                                gasPrice: new BigNumber(
                                    ethers.parseUnits(args.gasPrice.toString(), "gwei").toString()
                                ),
                                type: 0,
                            }
                            : {
                                type: 2,
                                maxPriorityFeePerGas: new BigNumber(
                                    (args.maxPriorityFeePerGas
                                        ? ethers.parseUnits(args.maxPriorityFeePerGas, "gwei")
                                        : gasFeeData.maxPriorityFeePerGas ?? ethers.parseUnits("1.5", "gwei")
                                    ).toString()
                                ),
                                maxFeePerGas: new BigNumber(
                                    (args.maxFeePerGas
                                        ? ethers.parseUnits(args.maxFeePerGas.toString(), "gwei")
                                        : gasFeeData.maxFeePerGas ?? ethers.parseUnits("3", "gwei")
                                    ).toString()
                                ),
                            }),
                    },
                };

                const signedTokenTx = await this.wallet.signTransaction(signParams);
                const broadcast = await providerInstance.broadcastTransaction(signedTokenTx);

                return successResponse({ broadcast });
            }

            // ==== CASE: NATIVE COIN TRANSFER ====
            signParams = {
                privateKey,
                data: {
                    to: recipientAddress.address,
                    value: new BigNumber(ethers.parseEther(args.amount.toString()).toString()),
                    nonce: args.nonce || await nonce,
                    gasLimit: args.gasLimit ? new BigNumber(args.gasLimit) : BigNumber(21000),
                    chainId: 11155111,
                    ...(args.gasPrice
                        ? {
                            gasPrice: new BigNumber(
                                ethers.parseUnits(args.gasPrice.toString(), "gwei").toString()
                            ),
                            type: 0,
                        }
                        : {
                            type: 2,
                            maxPriorityFeePerGas: (args.maxPriorityFeePerGas
                                ? ethers.parseUnits(args.maxPriorityFeePerGas, "gwei")
                                : gasFeeData.maxPriorityFeePerGas ?? ethers.parseUnits("0.1", "gwei")
                            ).toString(),
                            maxFeePerGas: new BigNumber(
                                (args.maxFeePerGas
                                    ? ethers.parseUnits(args.maxFeePerGas.toString(), "gwei")
                                    : gasFeeData.maxFeePerGas ?? ethers.parseUnits("3", "gwei")
                                ).toString()
                            ),
                        }),
                },
            };

            const signedTx = await this.wallet.signTransaction(signParams);
            const broadcast = await providerInstance.broadcastTransaction(signedTx);

            return successResponse({ ...broadcast });
        } catch (error) {
            throw error;
        }
    }



}
