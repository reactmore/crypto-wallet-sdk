import { WalletRegistry, WalletTypes } from "../services/wallet-registry";
import { DexConfig } from "../types";


interface ClientConfig<T extends WalletTypes> {
    network: T;
    chainId?: string;
    rpcUrl?: string;
}

export class CryptoClientSdk<T extends WalletTypes> {
    private network: T;
    private chainId?: string;
    private rpcUrl?: string;

    constructor({ network, chainId, rpcUrl }: ClientConfig<T>) {
        this.network = network;
        this.chainId = chainId;
        this.rpcUrl = rpcUrl;
    }

    getWallet(): InstanceType<(typeof WalletRegistry)[T]> {
        const WalletClass = WalletRegistry[this.network];

        const config: DexConfig = {
            chainId: this.chainId,
            rpcUrl: this.rpcUrl,
        };

        return new WalletClass(config) as InstanceType<(typeof WalletRegistry)[T]>;
    }
}