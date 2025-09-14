import { BaseWallet } from "../base/index";
import { DexConfig } from "../../types";
import { BtcWallet as BtcWalletOkxm, TBtcWallet } from "@okxweb3/coin-bitcoin";
import { IResponse, GenerateWalletPayload } from "./../../types";

const successResponse = (args: IResponse): IResponse => args;

export class BtcWallet extends BaseWallet {

    private wallet: BtcWalletOkxm | TBtcWallet;

    constructor(config: DexConfig) {
        super(config);
        this.wallet = this.config.cluster === "testnet" ? new TBtcWallet() : new BtcWalletOkxm();
    }

    async generateWallet({ mnemonic, derivationPath }: GenerateWalletPayload): Promise<IResponse> {
        const hdPath = derivationPath || "m/44'/0'/0'/0/0";
        const getMnemonic = mnemonic ?? (await this.generateMnemonic(12));

        const derivePrivateKey = await this.wallet.getDerivedPrivateKey({ mnemonic: getMnemonic, hdPath });
        const { address, publicKey } = await this.wallet.getNewAddress({ privateKey: derivePrivateKey });

        return successResponse({ address, publicKey, privateKey: derivePrivateKey });
    }


}
