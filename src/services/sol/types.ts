export interface BalanceSolanaPayload {
    address: string;
    rpcUrl?: string;
    contractAddress?: string;
}

export interface TransferSolanaPayload {
    recipientAddress: string;
    amount: number;
    rpcUrl?: string;
    privateKey: string;
    contractAddress?: string;
    nonce?: number;
    data?: string;
    gasPrice?: string;
    gasLimit?: number;
}

export interface GetSplTokenInfoPayload {
  rpcUrl?: string;
  contractAddress: string;
  cluster?: 'mainnet-beta' | 'testnet' | 'devnet';
}

