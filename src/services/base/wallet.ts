// src/wallet/base/BaseWallet.ts
import { DexAPI } from "../../api/dex";
import { DexConfig, ChainConfig } from "../../types";
import { bip39 } from "@okxweb3/crypto-lib";

abstract class BaseWallet {
    protected readonly config: DexConfig;
    protected readonly dex: DexAPI;
    protected readonly _currentChain: ChainConfig;

    constructor(config: DexConfig) {
        this.config = {
            timeout: 30000,
            ...config,
        };

        // DexAPI is pure registry
        this.dex = new DexAPI(this.config.networks);

        // resolve network ONCE
        this._currentChain = this.resolveChain();
    }

    /**
     * Network resolver (SINGLE SOURCE OF TRUTH)
     */
    private resolveChain(): ChainConfig {
        const { network, chainId, cluster } = this.config;

        if (!network) {
            throw new Error("config.network is required");
        }

        // -------- EVM --------
        if (network === "EVM") {
            if (chainId) {
                return this.dex.getNetworkConfig("EVM", chainId);
            }
            return this.dex.getDefaultNetworkConfig("EVM");
        }

        // -------- SOL --------
        if (network === "SOL") {
            const key = cluster ?? "devnet";
            return this.dex.getNetworkConfig("SOL", key);
        }

        // -------- FUTURE NETWORKS --------
        throw new Error(`Unsupported network: ${network}`);
    }

    /**
     * Resolved chain config (read-only)
     */
    public get currentChain(): ChainConfig {
        return this._currentChain;
    }

    public async generateMnemonic(numWords: number = 12): Promise<string> {
        const strength = (numWords / 3) * 32;
        return bip39.generateMnemonic(strength);
    }
}

export { BaseWallet };
