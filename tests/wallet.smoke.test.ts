import { CryptoClientSdk } from '../src';

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
const RPC = {
  ETH_SEPOLIA: 'https://ethereum-sepolia-rpc.publicnode.com',
};

const TEST_WALLET = {
  address: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
  privateKey: '0x3e241f7e6edcd5bf3a86de1f6588e70a3b89dcac8b3396f8f74572e8d5d370b2',
};

const MNEMONIC =
  'angle act turtle reveal inner question soul weekend act city illness laptop';

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
      rpcUrl: RPC.ETH_SEPOLIA,
    });

    wallet = client.getWallet();
  });

  /* --------------------------------------------------------------
   * Wallet
   * -------------------------------------------------------------- */
  it('should generate wallet from mnemonic', async () => {
    const res = await wallet.generateWallet({
      mnemonic: MNEMONIC,
      derivationPath: "m/44'/60'/0'/0/0",
    });

    log('generateWallet', res);
  });

  /* --------------------------------------------------------------
   * Balance
   * -------------------------------------------------------------- */
  it('should get native ETH balance', async () => {
    const res = await wallet.getBalance({
      address: TEST_WALLET.address,
    });

    log('getBalance', res);
  });

  /* --------------------------------------------------------------
   * Gas Estimation
   * -------------------------------------------------------------- */
  it('should estimate gas with presets (regular / express / instant)', async () => {
    const res = await wallet.estimateGas({
      recipientAddress: TEST_WALLET.address,
      amount: 0.00718639,
    });

    log('estimateGas', res);
  });

  /* --------------------------------------------------------------
   * Transfers
   * -------------------------------------------------------------- */
  describe('Transfer Native ETH', () => {

    it('should transfer with default (regular) fee', async () => {
      const res = await wallet.transfer({
        recipientAddress: TEST_WALLET.address,
        privateKey: TEST_WALLET.privateKey,
        amount: 0.005,
      });

      log('transfer | default fee', res);
      await sleep(15_000);
    });

    it('should transfer with custom EIP-1559 fee', async () => {
      const res = await wallet.transfer({
        recipientAddress: TEST_WALLET.address,
        privateKey: TEST_WALLET.privateKey,
        amount: 0.005,
        maxFeePerGas: '1077910542',      // wei
        maxPriorityFeePerGas: '1583107', // wei
      });

      log('transfer | custom EIP-1559 fee', res);
      await sleep(15_000);
    });

    it('should transfer with legacy gasPrice', async () => {
      const res = await wallet.transfer({
        recipientAddress: TEST_WALLET.address,
        privateKey: TEST_WALLET.privateKey,
        amount: 0.005,
        gasPrice: '20',   // gwei
        gasLimit: '21000',
      });

      log('transfer | legacy gasPrice', res);
      await sleep(15_000);
    });

  });

});
