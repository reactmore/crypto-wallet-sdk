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
const RPC = {
  ETH_SEPOLIA: 'https://ethereum-sepolia-rpc.publicnode.com',
};

const hash = {
  in: '0x4ce1de2bea3f3efbf7aedf893432094f8f6ef95a951d7750539592fb7ef4d464',
  withData: '0x952e1d03d945842d17b1b5f55cba3360363da7ace4889ffcb7babbfadbb8b977'
}

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
  it('should generate new wallet', async () => {
    const res = await wallet.generateWallet({
      derivationPath: "m/44'/60'/0'/0/0",
    });

    expect(typeof res).toBe('object');
    expect(res).toHaveProperty("address");
    expect(res).toHaveProperty("privateKey");
    expect(res).toHaveProperty("publicKey");
  });

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

  it('should generate wallet from privatekey', async () => {
    const res = await wallet.generateWallet({
      privateKey: TEST_WALLET.privateKey,
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

  it('should get transactions hash', async () => {
    const res = await wallet.getTransaction({
      hash: hash.withData,
      withReceipt: true,
    });

    log('transactions', res);

    expect(typeof res).toBe('object');
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

    it('should transfer with checking balance, gasPrice', async () => {
      const balance = await wallet.getBalance({
        address: TEST_WALLET.address,
      });

      const balanceWei = BigInt(balance._rawBalance);

      const est = await wallet.estimateGas({
        recipientAddress: "0x5FD27e9acdE48E2F65e46c9e92B9e56Fa0Ac3f65",
        amount: "0",
      });

      const gasLimit = BigInt(est.gasLimit);

      // chose regular or another
      const maxFeePerGas = BigInt(est.fees.regular.maxFeePerGas);

      // worst-case fee
      const feeWei = gasLimit * maxFeePerGas;
      const sendWei = balanceWei - feeWei;

      if (sendWei <= 0n) {
        throw new Error("Balance not enough to pay gas");
      }

      const sendEth = ethers.formatEther(sendWei);


      const trx = await wallet.transfer({
        recipientAddress: '0x5FD27e9acdE48E2F65e46c9e92B9e56Fa0Ac3f65',
        privateKey: TEST_WALLET.privateKey,
        amount: sendEth,
        gasLimit: gasLimit.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: est.fees.regular.maxPriorityFeePerGas,
      });

      expect(typeof trx).toBe('object');
    });

    it('should transfer all balance minus fee (LEGACY gasPrice)', async () => {
        // 1. Get balance
        const balance = await wallet.getBalance({
          address: "0x2E5cdb1bBa0787E79355C3FFD8B0308790dC0f09",
          rpcUrl: "https://binance.llamarpc.com",
        });
    
        const balanceWei = BigInt(balance._rawBalance);
    
        // 2. Estimate gas (legacy)
        const est = await wallet.estimateGas({
          recipientAddress: "0x5FD27e9acdE48E2F65e46c9e92B9e56Fa0Ac3f65",
          amount: "0",
          rpcUrl: "https://binance.llamarpc.com",
        });
    
        log("estimate", est);
    
    
        const gasLimit = BigInt(est.gasLimit);
        const gasPrice = BigInt(est.gasPrice);
    
        // 3. Compute fee
        const feeWei = gasLimit * gasPrice;
        const sendWei = balanceWei - feeWei;
    
        if (sendWei <= 0n) {
          throw new Error("Balance not enough to pay gas");
        }
    
        const sendEth = ethers.formatEther(sendWei);
    
        log("computed", {
          balanceWei: balanceWei.toString(),
          gasLimit: gasLimit.toString(),
          gasPrice: gasPrice.toString(),
          feeWei: feeWei.toString(),
          sendWei: sendWei.toString(),
          sendEth,
        });
    
        // 4. Send tx (LEGACY)
        const trx = await wallet.transfer({
          recipientAddress: '0x5FD27e9acdE48E2F65e46c9e92B9e56Fa0Ac3f65',
          privateKey: '0x9a08a2c99fd0c688a71a28501a523a26c60202c79d652be282bd49c50433cd41',
          amount: sendEth,
          gasLimit: gasLimit.toString(),
          gasPrice: est.gasPrice, // 👈 LEGACY ONLY
          rpcUrl: "https://binance.llamarpc.com",
        });
    
        log("tx", trx);
    
        expect(typeof trx).toBe('object');
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

    console.log(data);

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

    console.log(data);

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

    console.log(data);

    expect(typeof data).toBe('object');
  });
});
