import { ethers } from "ethers";

export interface GetContract {
    rpcUrl?: string;
    privateKey?: string;
    contractAddress?: string;
    abi?: any[];
}

export interface BalancePayload {
    address: string;
    rpcUrl?: string;
    contractAddress?: string;
}

export interface TransferPayload {
    recipientAddress: string;
    amount: number;
    rpcUrl?: string;
    privateKey: string;
    gasPrice?: string;              // gwei (legacy)
    contractAddress?: string;
    nonce?: number;
    data?: string;
    gasLimit?: string;              // unit gas
    maxPriorityFeePerGas?: string;  // wei
    maxFeePerGas?: string;          // wei
}

export interface GetTransactionPayload {
    rpcUrl?: string;
    hash: string;
}

export interface ISmartContractCallPayload {
    rpcUrl?: string;
    apiKey?: string;
    contractAddress: string;
    method: string;
    methodType: 'read' | 'write';
    params: any[];
    payment?: any[];
    value?: number;
    contractAbi?: any[];
    gasPrice?: string;
    gasLimit?: number;
    feeLimit?: number;
    nonce?: number;
    privateKey?: string;
}

export interface SignerPayload {
    args: any;
    nonce: Promise<number> | number | undefined;
    gasFeeData: ethers.FeeData;
    recipientAddress: { address: string };
    value: bigint | string;
    contractAddress?: string;
}

export interface GetErcTokenInfoPayload {
    rpcUrl: string;
    contractAddress: string;
    cluster?: 'mainnet-beta' | 'testnet' | 'devnet';
    apiKey?: string;
}