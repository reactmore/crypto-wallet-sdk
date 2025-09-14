import { BaseWallet } from "../base/index";
import { DexConfig } from "../../types";
import { base } from "@okxweb3/crypto-lib";
import { SolWallet as SolWalletOkx } from "@okxweb3/coin-solana";
import * as solanaWeb3 from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { ENV, TokenListProvider } from "@solana/spl-token-registry";
import { IResponse, GenerateWalletPayload, TokenInfo } from "./../../types";
import { BalanceSolanaPayload, TransferSolanaPayload, GetSplTokenInfoPayload } from "./types";
// @ts-ignore
import * as BufferLayout from 'buffer-layout';

const provider = (rpcUrl?: string) => new solanaWeb3.Connection(rpcUrl as string);

const successResponse = (args: IResponse): IResponse => args;

export const ACCOUNT_LAYOUT = BufferLayout.struct([
    BufferLayout.blob(32, 'mint'),
    BufferLayout.blob(32, 'owner'),
    BufferLayout.nu64('amount'),
    BufferLayout.blob(93),
]);

export const CLUSTER_ENV: Record<string, ENV> = {
    "mainnet-beta": ENV.MainnetBeta,
    "testnet": ENV.Testnet,
    "devnet": ENV.Devnet,
};

export class SolWallet extends BaseWallet {

    private wallet: SolWalletOkx;

    constructor(config: DexConfig) {
        super(config)
        this.wallet = new SolWalletOkx();
    }

    async generateWallet({ mnemonic, derivationPath }: GenerateWalletPayload): Promise<IResponse> {
        const hdPath = derivationPath || "m/44'/501'/0'/0'";
        const getMnemonic = mnemonic ?? (await this.generateMnemonic(12));

        const derivePrivateKey = await this.wallet.getDerivedPrivateKey({ mnemonic: getMnemonic, hdPath });
        const { address, publicKey } = await this.wallet.getNewAddress({ privateKey: derivePrivateKey });

        return successResponse({ address, publicKey, privateKey: derivePrivateKey });
    }

    async getBalance({ rpcUrl, contractAddress, address }: BalanceSolanaPayload): Promise<IResponse> {
        const connection = provider(rpcUrl ?? this.config.rpcUrl);
        try {
            const recipientAddress = await this.wallet.validAddress({ address });
            if (!recipientAddress.isValid) throw new Error("address not valid");

            const publicKey = new solanaWeb3.PublicKey(recipientAddress.address);
            if (contractAddress) {
                const mintPubkey = new solanaWeb3.PublicKey(contractAddress);
                const tokenAccountAddress = await getAssociatedTokenAddress(mintPubkey, publicKey);
                const balance = await connection.getTokenAccountBalance(tokenAccountAddress);
                return successResponse({
                    balance: balance.value.uiAmount,
                    _rawBalance: balance.value.amount,
                    _decimal: balance.value.decimals,
                });
            }

            const balance = await connection.getBalance(publicKey);
            return successResponse({
                balance: balance / solanaWeb3.LAMPORTS_PER_SOL,
            });
        } catch (error) {
            throw error;
        }
    }

    async transfer({ privateKey, contractAddress, rpcUrl, ...args }: TransferSolanaPayload & { createAssociatedAddress?: boolean; token2022?: boolean }): Promise<IResponse> {
        const connection = provider(rpcUrl ?? this.config.rpcUrl);

        try {
            // validate recipient
            const recipientAddress = await this.wallet.validAddress({ address: args.recipientAddress });
            if (!recipientAddress.isValid) throw new Error("address not valid");

            // get sender info from privateKey using OKX wallet util
            const fromAccount = await this.wallet.getNewAddress({ privateKey });

            // recommended fees (CU)
            let { computeUnitLimit, computeUnitPrice } = await this.getRecommendedFees(connection);
            if (args.gasLimit) computeUnitLimit = args.gasLimit;
            if (args.gasPrice) computeUnitPrice = parseInt(args.gasPrice as any, 10);

            // get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();

            // ---------- SPL TOKEN FLOW ----------
            if (contractAddress) {
                const mintPubkey = new solanaWeb3.PublicKey(contractAddress);
                const fromPubkey = new solanaWeb3.PublicKey(fromAccount.address);
                const recipientPubkey = new solanaWeb3.PublicKey(recipientAddress.address);

                // Associated Token Accounts (computed, not necessarily exist)
                const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
                const recipientTokenAccount = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

                // Try to read decimals from sender token account first, fallback to token supply
                let decimals = 0;
                try {
                    const fromTokenBal = await connection.getTokenAccountBalance(fromTokenAccount);
                    decimals = fromTokenBal.value.decimals;
                } catch (err) {
                    // fallback: try to fetch mint info (supply) to get decimals
                    try {
                        const mintAccountInfo = await connection.getParsedAccountInfo(mintPubkey);
                        // parsed data path may vary; handle gracefully
                        // if parsed exists:
                        if (mintAccountInfo.value && (mintAccountInfo.value.data as any).parsed) {
                            const parsed = (mintAccountInfo.value.data as any).parsed;
                            decimals = parsed.info.decimals || 0;
                        }
                    } catch (err2) {
                        // cannot determine decimals — throw explicit error
                        throw new Error("Failed to determine token decimals for mint " + contractAddress);
                    }
                }

                // Check whether recipient ATA exists
                const recipientAtaInfo = await connection.getAccountInfo(recipientTokenAccount);
                const recipientHasATA = !!recipientAtaInfo;

                // decide whether to create ATA: user can pass args.createAssociatedAddress
                const shouldCreateATA = !!(args.createAssociatedAddress) && !recipientHasATA;

                // compute token amount (smallest unit)
                // args.amount is assumed token amount in human units (eg. 1.5 USDC)
                const rawTokenAmount = BigInt(Math.round((args.amount ?? 0) * (10 ** decimals)));

                // Build params for OKX wallet signTransaction (tokenTransfer)
                const params = {
                    privateKey,
                    data: {
                        type: "tokenTransfer",
                        payer: fromAccount.address,
                        from: fromAccount.address,
                        to: recipientAddress.address,
                        blockHash: blockhash,
                        mint: contractAddress,
                        amount: rawTokenAmount.toString(),     // send as string
                        decimal: decimals,
                        createAssociatedAddress: !!shouldCreateATA, // OKX SDK should create ATA if true
                        token2022: !!args.token2022, // allow override by user
                        computeUnitLimit,
                        computeUnitPrice
                    }
                };

                // sign & broadcast
                const signedTx = await this.wallet.signTransaction(params);
                // OKX returns base58 signed tx — decode and broadcast
                const rawTx = base.fromBase58(signedTx);
                const txid = await connection.sendRawTransaction(rawTx, { skipPreflight: false, maxRetries: 3 });
                return successResponse({ hash: txid });
            }

            // ---------- NATIVE SOL FLOW ----------
            const lamports = Math.round((args.amount ?? 0) * solanaWeb3.LAMPORTS_PER_SOL);

            const solParams = {
                privateKey,
                data: {
                    type: "transfer",
                    payer: fromAccount.address,
                    from: fromAccount.address,
                    to: recipientAddress.address,
                    blockHash: blockhash,
                    amount: lamports,
                    computeUnitLimit,
                    computeUnitPrice
                }
            };

            const signedTx = await this.wallet.signTransaction(solParams);
            const rawTx = base.fromBase58(signedTx);
            const broadcast = await connection.sendRawTransaction(rawTx, {
                skipPreflight: false,
                maxRetries: 3,
            });

            return successResponse({ hash: broadcast });
        } catch (error) {
            throw error;
        }
    }

    async getTokenInfo({ contractAddress, rpcUrl, cluster = "mainnet-beta" }: GetSplTokenInfoPayload): Promise<IResponse> {
        try {
            const connection = provider(rpcUrl ?? this.config.rpcUrl);
            const mintAddress = new solanaWeb3.PublicKey(contractAddress);

            // --- step 1: fetch mint info dari RPC ---
            const mintInfo = await connection.getParsedAccountInfo(mintAddress);
            const parsedMint = (mintInfo?.value?.data as any)?.parsed?.info;


            const decimals = parsedMint?.decimals ?? 0;
            const supplyRaw = parsedMint?.supply ?? "0";

            // --- step 2: coba ambil info dari TokenListProvider ---
            let tokenName = "";
            let tokenSymbol = "";
            let tokenLogo = "";

            try {
                const env = CLUSTER_ENV[cluster] ?? ENV.MainnetBeta;
                const provider = await new TokenListProvider().resolve();
                const tokenList = provider.filterByChainId(env).getList();
                const tokenMap = new Map(tokenList.map((item) => [item.address, item]));
                const token = tokenMap.get(mintAddress.toBase58());

                if (token) {
                    tokenName = token.name;
                    tokenSymbol = token.symbol;
                    tokenLogo = token.logoURI || "";
                }
            } catch (err) {
                console.warn("TokenListProvider failed:", err);
            }

            // --- step 3: fallback kalau name/symbol kosong ---
            if (!tokenName) tokenName = contractAddress.slice(0, 6) + "...";
            if (!tokenSymbol) tokenSymbol = "SPL";

            const data: TokenInfo = {
                name: tokenName,
                symbol: tokenSymbol,
                address: contractAddress,
                decimals,
                logoUrl: tokenLogo || "",
                totalSupply: (Number(supplyRaw) / 10 ** decimals).toString(),
            };

            return successResponse({ ...data });
        } catch (error) {
            throw error;
        }
    };

    private async getRecommendedFees(connection: solanaWeb3.Connection) {
        let computeUnitLimit = 140000; // default 
        let computeUnitPrice = 0;      // default = 0 (without priority fee)

        try {
            const fees = await connection.getRecentPrioritizationFees();
            if (fees.length > 0) {
                // Ambil median biar stabil
                const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
                computeUnitPrice = sorted[Math.floor(sorted.length / 2)] || 0;
            }
        } catch (err) {
            console.warn("Failed to fetch prioritization fees, fallback to defaults");
        }

        return { computeUnitLimit, computeUnitPrice };
    }
}
