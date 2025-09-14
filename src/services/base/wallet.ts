import { DexAPI } from "./../../api/dex";
import { DexConfig, ChainConfig } from "./../../types";
import { bip39 } from "@okxweb3/crypto-lib";

abstract class BaseWallet {

    public config: DexConfig;
    public dex: DexAPI;

    constructor(config: DexConfig) {
        this.config = {
            timeout: 30000,
            ...config,
        };

        this.dex = new DexAPI(this.config);
    }

    public get currentChain(): ChainConfig {
        if (!this.config.chainId) throw new Error("chainId not set in config");
        return this.dex.getNetworkConfig(this.config.chainId);
    }

    public async generateMnemonic(numWords: number = 12): Promise<string> {
        const strength = (numWords / 3) * 32;
        return bip39.generateMnemonic(strength);
    }
}

export { BaseWallet }