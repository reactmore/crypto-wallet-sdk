// src/utils/evmUnits.ts
import { parseAmount, formatAmount } from "./amount";

// Ether = 18 decimals
export const parseEther = (v: string | number) => parseAmount(v, 18);
export const formatEther = (v: bigint | string) => formatAmount(v, 18);

// Gwei = 9 decimals
export const parseGwei = (v: string | number) => parseAmount(v, 9);
export const formatGwei = (v: bigint | string) => formatAmount(v, 9);

// Wei = 0 decimals (identity, tapi biar konsisten)
export const parseWei = (v: string | number) => parseAmount(v, 0);
export const formatWei = (v: bigint | string) => formatAmount(v, 0);
