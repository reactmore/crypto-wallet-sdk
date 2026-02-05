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
 * Network Configs
 * ------------------------------------------------------------------ */
const NETWORKS: Record<string, any> = {
  "eth-sepolia": {
    name: "Ethereum Sepolia",
    chainId: "11155111",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    tokenTestAddress: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  },
  "eth-arb": {
    name: "Arbitrum Sepolia",
    chainId: "421614",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    tokenTestAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  },
  "bsc": {
    name: "BSC Testnet",
    chainId: "97",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    tokenTestAddress: "",
  },
};

const chainKey = process.env.npm_config_chain || "eth-sepolia";

if (!NETWORKS[chainKey]) {
  throw new Error(`Unknown chain: ${chainKey}`);
}

const CHAIN = NETWORKS[chainKey];

/* ------------------------------------------------------------------
 * Test Wallet
 * ------------------------------------------------------------------ */
const TEST_WALLET = {
  address: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
  privateKey: '0x3e241f7e6edcd5bf3a86de1f6588e70a3b89dcac8b3396f8f74572e8d5d370b2',
};

const MNEMONIC =
  'angle act turtle reveal inner question soul weekend act city illness laptop';

/* ------------------------------------------------------------------
 * Globals
 * ------------------------------------------------------------------ */
let client: any;
let wallet: any;

/* ------------------------------------------------------------------
 * Tests
 * ------------------------------------------------------------------ */
describe(`EVM Wallet Smoke Test (${CHAIN.name})`, () => {
  beforeAll(() => {
    client = new CryptoClientSdk({
      network: 'EVM',
      chainId: CHAIN.chainId,
      rpcUrl: CHAIN.rpcUrl,
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
  it('should get native ETH ARB balance', async () => {
    const res = await wallet.getBalance({
      address: TEST_WALLET.address,
    });

    expect(typeof res).toBe('object');
    expect(res).toHaveProperty("balance");
    expect(res).toHaveProperty("_rawBalance");
    expect(res).toHaveProperty("_decimal");
  });

  it('should get token balance', async () => {
    const res = await wallet.getBalance({
      address: TEST_WALLET.address,
      contractAddress: CHAIN.tokenTestAddress,
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
      amount: '0.00718639',
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

  /* --------------------------------------------------------------
   * SMART CONTRACT
   * -------------------------------------------------------------- */
  it('smart contract call (get token Balance)', async () => {
    const data = await wallet.smartContractCall({
      contractAddress: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9',
      method: 'balanceOf',
      methodType: 'read',
      params: ['0x45BeEcA6ebEA6f99De93e39572ec62449315aa80'],
    });

    expect(typeof data).toBe('object');
  });

  it('smart contract call (ERC20 token transfer)', async () => {
    const data = await wallet.smartContractCall({
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      contractAddress: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9',
      method: 'transfer',
      methodType: 'write',
      params: [
        '0x45BeEcA6ebEA6f99De93e39572ec62449315aa80',
        '1000000',
      ],
      contractAbi: [
        {
          constant: false,
          inputs: [
            { name: '_to', type: 'address' },
            { name: '_value', type: 'uint256' },
          ],
          name: 'transfer',
          outputs: [{ name: '', type: 'bool' }],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      privateKey:
        '0x3e241f7e6edcd5bf3a86de1f6588e70a3b89dcac8b3396f8f74572e8d5d370b2',
    });

    expect(typeof data).toBe('object');
  });

  it('smart contract call (get factory Uniswap)', async () => {
    const data = await wallet.smartContractCall({
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      contractAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
      method: 'factory',
      methodType: 'read',
      params: [],
      contractAbi: [
        {
          inputs: [],
          name: 'factory',
          outputs: [{ internalType: 'address', name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
    });

    expect(typeof data).toBe('object');
  });
});
