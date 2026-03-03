// src/services/wallet-registry.ts
import { EvmWallet, BtcWallet, SolWallet } from "./index";
import { DogeWallet } from "./doge";

export const WalletRegistry = {
  EVM: EvmWallet,
  BTC: BtcWallet,
  DOGE: DogeWallet,
  SOL: SolWallet,
};

export type WalletTypes = keyof typeof WalletRegistry;
