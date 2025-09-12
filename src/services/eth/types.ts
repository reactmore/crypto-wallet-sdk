export interface TransferPayload {
    recipientAddress: string;
    amount: number;
    rpcUrl?: string;
    privateKey: string;
    gasPrice?: string;
    contractAddress?: string;
    nonce?: number;
    data?: string;
    gasLimit?: number;
    maxPriorityFeePerGas?: string;
    maxFeePerGas?: string;
}

export interface GenerateWalletPayload {
    mnemonic?: string;
    derivationPath?: string;
}

export interface GetContract {
    rpcUrl?: string;
    privateKey?: string;
    contractAddress?: string;
    abi?: any[];
}

export interface BalanceResult {
    address: string;
    balance: string;
}

export interface BalancePayload {
    address: string;
    rpcUrl?: string;
    contractAddress?: string;
}