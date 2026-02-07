// src/utils/solUnits.ts
import { parseAmount, formatAmount } from "./amount";

// SOL = 9 decimals (lamports)
export const parseSOL = (v: string | number) => parseAmount(v, 9);
export const formatSOL = (v: bigint | string) => formatAmount(v, 9);

// lamport = 0 decimals
export const parseLamport = (v: string | number) => parseAmount(v, 0);
export const formatLamport = (v: bigint | string) => formatAmount(v, 0);
