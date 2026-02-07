import { CryptoClientSdk } from '../src';
import { ethers } from "ethers";

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const log = (title: string, data: any) => {
  console.log(`\n=== ${title} ===`);
  console.dir(data, { depth: null });
};

/* ------------------------------------------------------------------
 * Test Config
 * ------------------------------------------------------------------ */
const RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

const TEST_WALLET = {
  address: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
  privateKey: '0x3e241f7e6edcd5bf3a86de1f6588e70a3b89dcac8b3396f8f74572e8d5d370b2',
};

const MNEMONIC =
  'angle act turtle reveal inner question soul weekend act city illness laptop';


const hash = {
  in: '0x4ce1de2bea3f3efbf7aedf893432094f8f6ef95a951d7750539592fb7ef4d464',
  withData: '0x952e1d03d945842d17b1b5f55cba3360363da7ace4889ffcb7babbfadbb8b977'
}

/* ------------------------------------------------------------------
 * Globals (initialized in beforeAll)
 * ------------------------------------------------------------------ */
let client
let wallet: any;

/* ------------------------------------------------------------------
 * Tests
 * ------------------------------------------------------------------ */
describe('EVM Wallet (Ethereum Sepolia)', () => {
  beforeAll(() => {
    client = new CryptoClientSdk({
      network: 'EVM',
      chainId: '11155111',
      rpcUrl: RPC,
    });

    wallet = client.getWallet();
  });

  it('should get native ETH balance', async () => {
    const res = await wallet.getBalance({
      address: TEST_WALLET.address,
    });

    log('balance', res);

    expect(typeof res).toBe('object');
    expect(res).toHaveProperty("balance");
    expect(res).toHaveProperty("_rawBalance");
    expect(res).toHaveProperty("_decimal");
  });

  it('should transfer native', async () => {
    const res = await wallet.transfer({
      recipientAddress: TEST_WALLET.address,
      privateKey: TEST_WALLET.privateKey,
      amount: 0,
    });

    log('transfer native', res);
    expect(typeof res).toBe('object');
  });

  it('should transfer token', async () => {
    const res = await wallet.transfer({
      recipientAddress: TEST_WALLET.address,
      privateKey: TEST_WALLET.privateKey,
      contractAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",      // USDC
      amount: 0.005,
    });

    log('transfer token', res);
    expect(typeof res).toBe('object');
  });



});
