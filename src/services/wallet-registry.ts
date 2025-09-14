// src/services/wallet-registry.ts
import { EvmWallet, BtcWallet, SolWallet } from "./index";

export const WalletRegistry = {
  EVM: EvmWallet,
  BTC: BtcWallet,
  SOL: SolWallet,
};

export type WalletTypes = keyof typeof WalletRegistry;
