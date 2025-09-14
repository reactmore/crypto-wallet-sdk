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

export interface NetworkConfigs {
    [chainId: string]: ChainConfig;
}

export interface DexConfig {
    networks?: NetworkConfigs;
    timeout?: number;
    chainId?: string;
    cluster?: string;
    rpcUrl?: string;
}

export interface IResponse {
    [key: string]: any;
}

export interface GenerateWalletPayload {
    mnemonic?: string;
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