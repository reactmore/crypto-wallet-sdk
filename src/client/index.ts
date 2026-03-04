import { WalletRegistry, WalletTypes } from "../services/wallet-registry";
import { DexConfig } from "../types";


interface ClientConfig<T extends WalletTypes> {
    network: T;
    chainId?: string;
    cluster?: string;
    rpcUrl?: string;
}

export class CryptoClientSdk<T extends WalletTypes> {
    private network: T;
    private chainId?: string;
    private cluster?: string;
    private rpcUrl?: string;

    constructor({ network, chainId, cluster, rpcUrl }: ClientConfig<T>) {
        this.network = network;
        this.chainId = chainId;
        this.cluster = cluster;
        this.rpcUrl = rpcUrl;
    }

    getWallet(): InstanceType<(typeof WalletRegistry)[T]> {
        const WalletClass = WalletRegistry[this.network];

        const config: DexConfig = {
            network: this.network,
            chainId: this.chainId,
            cluster: this.cluster,
            rpcUrl: this.rpcUrl,
        };

        return new WalletClass(config) as InstanceType<(typeof WalletRegistry)[T]>;
    }
}