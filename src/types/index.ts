export interface ChainConfig {
    id: string;
    explorer: string;
    defaultSlippage: string;
    maxSlippage: string;
    computeUnits?: number;
    confirmationTimeout?: number;
    maxRetries?: number;
    dexContractAddress?: string;
}

export type DexNetwork = "EVM" | "SOL" | "BTC" | "DOGE" | "SUI";

export type Network =
  | 'ethereum'
  | 'solana'
  | 'tron'
  | 'waves'
  | 'bitcoin'
  | 'bitcoin-testnet'
  | 'ton';

export interface DexNetworkConfigs {
    [network: string]: {
        [key: string]: ChainConfig; // chainId | cluster | whatever
    };
}

export interface DexConfig {
    network: DexNetwork;
    // override configs (optional)
    networks?: DexNetworkConfigs;
    // runtime options
    timeout?: number;
    // network-specific hints
    chainId?: string;   // EVM
    cluster?: string;   // SOL
    rpcUrl?: string;
}


export interface IResponse {
    [key: string]: any;
}

export interface GenerateWalletPayload {
    mnemonic?: string;
    privateKey?: string;
    derivationPath?: string;
}

export interface TokenInfo {
    name: string;
    symbol: string;
    address?: string;
    decimals: number;
    totalSupply: string;
    logoUrl?: string;
}
