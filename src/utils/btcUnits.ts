// src/utils/btcUnits.ts
import { parseAmount, formatAmount } from "./amount";

// BTC = 8 decimals (satoshi)
export const parseBTC = (v: string | number) => parseAmount(v, 8);
export const formatBTC = (v: bigint | string) => formatAmount(v, 8);

// satoshi = 0 decimals
export const parseSatoshi = (v: string | number) => parseAmount(v, 0);
export const formatSatoshi = (v: bigint | string) => formatAmount(v, 0);
