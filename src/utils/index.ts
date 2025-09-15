import { IResponse } from './../types';
import BigNumber from "bignumber.js";

export const successResponse = (args: IResponse): IResponse => {
  return args;
};

/**
 * Convert human-readable amount → raw integer (BigInt) by decimals
 * ex: 0.1 USDC (decimals 6) => 100000n
 */
export const parseAmount = (amount: string | number, decimals: number): bigint => {
    const bn = new BigNumber(amount);
    const multiplier = new BigNumber(10).pow(decimals);
    return BigInt(bn.times(multiplier).toFixed(0));
};

/**
 * Convert raw amount → human-readable string by decimals
 * ex: 100000n USDC (decimals 6) => "0.1"
 */
export const formatAmount = (raw: bigint | string, decimals: number): number => {
    const bn = new BigNumber(raw.toString());
    const divisor = new BigNumber(10).pow(decimals);
    return bn.dividedBy(divisor).toNumber();
};