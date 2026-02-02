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

    expect(typeof res).toBe('object');
    expect(res).toHaveProperty("address");
    expect(res).toHaveProperty("privateKey");
    expect(res).toHaveProperty("publicKey");
  });

  /* --------------------------------------------------------------
   * Balance
   * -------------------------------------------------------------- */
  it('should get native ETH balance', async () => {
    const res = await wallet.getBalance({
      address: TEST_WALLET.address,
    });

    expect(typeof res).toBe('object');
    expect(res).toHaveProperty("balance");
    expect(res).toHaveProperty("_rawBalance");
    expect(res).toHaveProperty("_decimal");
  });

  it('should get ERC20 token balance', async () => {
    const res = await wallet.getBalance({
      address: TEST_WALLET.address,
      contractAddress: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9',
    });

    expect(typeof res).toBe('object');
    expect(res).toHaveProperty("balance");
    expect(res).toHaveProperty("_rawBalance");
    expect(res).toHaveProperty("_decimal");
  });

  /* --------------------------------------------------------------
   * Gas Estimation
   * -------------------------------------------------------------- */
  it('should estimate gas with presets (regular / express / instant)', async () => {
    const res = await wallet.estimateGas({
      recipientAddress: TEST_WALLET.address,
      amount: 0.00718639,
    });

    expect(typeof res).toBe('object');
  });

  /* --------------------------------------------------------------
   * TOKEN INFO
   * -------------------------------------------------------------- */
  it('should get ERC20 token info', async () => {
    const data = await wallet.getTokenInfo({
      contractAddress: '0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2',
    });

    expect(typeof data).toBe('object');
    expect(typeof (data && data.name)).toBe('string');
    expect(typeof (data && data.symbol)).toBe('string');
    expect(typeof (data && data.decimals)).toBe('bigint');
    expect(typeof (data && data.totalSupply)).toBe('string');
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

      expect(typeof res).toBe('object');
    });

    it('should transfer with custom EIP-1559 fee', async () => {
      const res = await wallet.transfer({
        recipientAddress: TEST_WALLET.address,
        privateKey: TEST_WALLET.privateKey,
        amount: 0.005,
        maxFeePerGas: '1077910542',      // wei
        maxPriorityFeePerGas: '1583107', // wei
      });

      expect(typeof res).toBe('object');
    });

    it('should transfer with legacy gasPrice', async () => {
      const res = await wallet.transfer({
        recipientAddress: TEST_WALLET.address,
        privateKey: TEST_WALLET.privateKey,
        amount: 0.005,
        gasPrice: '20',   // gwei
        gasLimit: '21000',
      });

      expect(typeof res).toBe('object');
    });

  });

});
