import { BaseWallet } from "../base/index";
import { DexConfig } from "../../types";
import { BtcWallet as BtcWalletOkxm, TBtcWallet } from "@okxweb3/coin-bitcoin";
import { IResponse, GenerateWalletPayload } from "./../../types";
import { formatBTC, parseBTC } from "../../utils";

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

const DUST_LIMIT = 546;
const DEFAULT_FIXED_FEE = 10000;

const estimateTxSize = (inputs: number, outputs: number) => 10 + inputs * 68 + outputs * 31;

const sortUtxos = (a: BtcUtxo, b: BtcUtxo) => {
    if (a.value !== b.value) return b.value - a.value;
    const aConf = a.status?.confirmed ? 1 : 0;
    const bConf = b.status?.confirmed ? 1 : 0;
    if (aConf !== bConf) return bConf - aConf;
    return a.txid.localeCompare(b.txid);
};

export class BtcWallet extends BaseWallet {

    private wallet: BtcWalletOkxm | TBtcWallet;

    constructor(config: DexConfig) {
        super(config);
        this.wallet = this.config.cluster === "testnet" ? new TBtcWallet() : new BtcWalletOkxm();
    }

    private get explorerApiBaseUrl(): string {
        return this.config.cluster === "testnet"
            ? "https://blockstream.info/testnet/api"
            : "https://blockstream.info/api";
    }

    private async request(path: string, init?: RequestInit) {
        const response = await fetch(`${this.explorerApiBaseUrl}${path}`, init);

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`BTC API error ${response.status}: ${body}`);
        }

        return response;
    }

    async generateWallet({ mnemonic, derivationPath }: GenerateWalletPayload): Promise<IResponse> {
        const hdPath = derivationPath || "m/44'/0'/0'/0/0";
        const getMnemonic = mnemonic ?? (await this.generateMnemonic(12));

        const derivePrivateKey = await this.wallet.getDerivedPrivateKey({ mnemonic: getMnemonic, hdPath });
        const { address, publicKey } = await this.wallet.getNewAddress({ privateKey: derivePrivateKey });

        return successResponse({ address, publicKey, privateKey: derivePrivateKey, mnemonic: getMnemonic });
    }

    async getBalance({ address }: BalancePayload): Promise<IResponse> {
        const response = await this.request(`/address/${address}`);
        const data = await response.json();

        const confirmed = (data.chain_stats?.funded_txo_sum ?? 0) - (data.chain_stats?.spent_txo_sum ?? 0);
        const unconfirmed = (data.mempool_stats?.funded_txo_sum ?? 0) - (data.mempool_stats?.spent_txo_sum ?? 0);
        const total = confirmed + unconfirmed;

        return successResponse({
            balance: formatBTC(total.toString()),
            confirmedBalance: formatBTC(confirmed.toString()),
            unconfirmedBalance: formatBTC(unconfirmed.toString()),
            _rawBalance: total,
            _rawConfirmedBalance: confirmed,
            _rawUnconfirmedBalance: unconfirmed,
            _decimal: 8,
        });
    }

    async getTransactions({ address, limit = 25 }: GetTransactionsPayload): Promise<IResponse> {
        const response = await this.request(`/address/${address}/txs`);
        const txs = await response.json();

        const transactions = txs.slice(0, limit).map((tx: any) => {
            const received = tx.vout
                .filter((out: any) => out.scriptpubkey_address === address)
                .reduce((acc: number, out: any) => acc + out.value, 0);

            const sent = tx.vin
                .filter((input: any) => input.prevout?.scriptpubkey_address === address)
                .reduce((acc: number, input: any) => acc + input.prevout.value, 0);

            const direction = received >= sent ? "in" : "out";
            const amount = direction === "in" ? received - sent : sent - received;

            return {
                hash: tx.txid,
                direction,
                amount: formatBTC(amount.toString()),
                _rawAmount: amount,
                fee: formatBTC((tx.fee ?? 0).toString()),
                _rawFee: tx.fee ?? 0,
                blockHeight: tx.status?.block_height ?? null,
                blockTime: tx.status?.block_time ?? null,
                confirmed: Boolean(tx.status?.confirmed),
            };
        });

        return successResponse({ transactions });
    }

    async getTransaction({ hash }: GetTransactionPayload): Promise<IResponse> {
        const response = await this.request(`/tx/${hash}`);
        const tx = await response.json();

        return successResponse({
            hash: tx.txid,
            fee: formatBTC((tx.fee ?? 0).toString()),
            _rawFee: tx.fee ?? 0,
            confirmed: Boolean(tx.status?.confirmed),
            blockHeight: tx.status?.block_height ?? null,
            blockTime: tx.status?.block_time ?? null,
            inputs: tx.vin,
            outputs: tx.vout,
        });
    }

    async transfer({ privateKey, recipientAddress, amount, feePerB, fee = DEFAULT_FIXED_FEE, subtractFee = false, addressType }: TransferPayload): Promise<IResponse> {
        const sender = await this.wallet.getNewAddress({ privateKey, ...(addressType ? { addressType } : {}) });
        const senderAddress = sender.address;
        const recipientValidation = await this.wallet.validAddress({ address: recipientAddress });

        if (!recipientValidation.isValid) {
            throw new Error("recipient address not valid");
        }

        const utxoResponse = await this.request(`/address/${senderAddress}/utxo`);
        const utxos = (await utxoResponse.json() as BtcUtxo[]).sort(sortUtxos);

        const requestedAmount = Number(parseBTC(amount.toString()));
        const selectedUtxos: BtcUtxo[] = [];
        let selectedAmount = 0;

        for (const utxo of utxos) {
            selectedUtxos.push(utxo);
            selectedAmount += utxo.value;

            const dynamicFee = feePerB ? Math.ceil(estimateTxSize(selectedUtxos.length, 2) * feePerB) : fee;
            const transferAmount = subtractFee ? requestedAmount - dynamicFee : requestedAmount;

            if (transferAmount <= 0) {
                throw new Error("Amount must be greater than fee when subtractFee is enabled");
            }

            if (selectedAmount >= transferAmount + dynamicFee) break;
        }

        const computedFee = feePerB ? Math.ceil(estimateTxSize(selectedUtxos.length, 2) * feePerB) : fee;
        const finalAmount = subtractFee ? requestedAmount - computedFee : requestedAmount;

        if (finalAmount <= 0) {
            throw new Error("Amount must be greater than fee when subtractFee is enabled");
        }

        if (selectedAmount < finalAmount + computedFee) {
            throw new Error("Insufficient BTC balance for amount + fee");
        }

        const change = selectedAmount - finalAmount - computedFee;
        const outputs = [{ address: recipientAddress, amount: finalAmount }];

        if (change > DUST_LIMIT) {
            outputs.push({ address: senderAddress, amount: change });
        }

        const rawTx = await this.wallet.signTransaction({
            privateKey,
            data: {
                inputs: selectedUtxos.map((utxo: BtcUtxo) => ({
                    txId: utxo.txid,
                    vOut: utxo.vout,
                    amount: utxo.value,
                    address: senderAddress,
                })),
                outputs,
                address: senderAddress,
                feePerB: feePerB ?? 1,
            },
        });

        const broadcastResponse = await this.request(`/tx`, {
            method: "POST",
            body: rawTx,
            headers: {
                "Content-Type": "text/plain",
            },
        });

        const txid = await broadcastResponse.text();

        return successResponse({
            txid,
            rawTx,
            from: senderAddress,
            to: recipientAddress,
            amount: formatBTC(finalAmount.toString()),
            _rawAmount: finalAmount,
            fee: formatBTC(computedFee.toString()),
            _rawFee: computedFee,
            subtractFee,
        });
    }

}
