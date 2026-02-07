// src/utils/amount.ts
import BigNumber from "bignumber.js";

/**
 * Convert human-readable amount → raw integer by decimals
 * ex: 0.1 USDC (decimals 6) => 100000
 */
export const parseAmount = (amount: string | number, decimals: number): bigint => {
    const bn = new BigNumber(amount);
    const multiplier = new BigNumber(10).pow(decimals);
    return BigInt(bn.times(multiplier).toFixed(0));
};

/**
 * Convert raw amount → human-readable number by decimals
 * ex: 100000 (decimals 6) => 0.1
 */
export const formatAmount = (raw: bigint | string, decimals: number): number => {
    const bn = new BigNumber(raw.toString());
    const divisor = new BigNumber(10).pow(decimals);
    return bn.dividedBy(divisor).toNumber();
};
