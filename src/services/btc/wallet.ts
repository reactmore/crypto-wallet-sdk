import { BaseWallet } from "../base/index";
import { DexConfig } from "../../types";
import { BtcWallet as BtcWalletOkxm, TBtcWallet } from "@okxweb3/coin-bitcoin";
import { IResponse, GenerateWalletPayload } from "./../../types";
import { formatBTC, parseBTC } from "../../utils";
import * as utxolib from '@bitgo/utxo-lib';
import BigNumber from 'bignumber.js';
import { _apiFallbacks } from './fallbacks/btc';
import { fallback, retryNTimes } from './utils/retry';

const successResponse = (args: IResponse): IResponse => args;

interface BalancePayload {
    address: string;
}

interface TransferPayload {
    privateKey: string;
    recipientAddress: string;
    amount: number | string;
    feePerB?: number;
    fee?: number;
    subtractFee?: boolean;
    addressType?: "Legacy" | "segwit_native" | "segwit_nested" | "segwit_taproot";
}

interface GetTransactionsPayload {
    address: string;
    limit?: number;
}

interface GetTransactionPayload {
    hash: string;
}

interface BtcUtxo {
    txid: string;
    vout: number;
    value: number;
    status?: {
        confirmed?: boolean;
        block_height?: number;
        block_time?: number;
    };
}

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

        console.log(this.config.cluster);

        return successResponse({ address, publicKey, privateKey: derivePrivateKey, mnemonic: getMnemonic });
    }

    async getBalance({ address }: BalancePayload): Promise<IResponse> {

        const testnet = this.config.cluster === 'testnet';

        const endpoints = _apiFallbacks.fetchUTXOs(testnet, address, 0);

        console.log(endpoints);

        const utxos = await fallback(endpoints);

        const bn = utxos
            .reduce((sum, utxo) => sum.plus(utxo.amount), new BigNumber(0))
            .dividedBy(new BigNumber(10).exponentiatedBy(8));

        return successResponse({
            balance: bn.toNumber(),
        });
    }
}
