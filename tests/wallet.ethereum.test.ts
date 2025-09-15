import {
  CryptoClientSdk,
} from '../src';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Ethereum tests', () => {
  const client = new CryptoClientSdk({
    network: "EVM",
    chainId: "11155111",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  });

  const wallet = client.getWallet();

  it('generateMnemonic from Base', async () => {
    const mnemonic = await wallet.generateMnemonic(12);

    expect(typeof mnemonic).toBe('string');
  });

  it('generateWallet', async () => {
    const data = await wallet.generateWallet({
      mnemonic: "angle act turtle reveal inner question soul weekend act city illness laptop",
      derivationPath: "m/44'/60'/0'/0/0",
    });

    expect(typeof data).toBe('object');
  });

  it('getBalance', async () => {
    const data = await wallet.getBalance({
      address: "0x45BeEcA6ebEA6f99De93e39572ec62449315aa80",
    });

    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('balance');
    expect(typeof data.balance).toBe('number');
  });

  it('getBalance ERC20 token balance', async () => {
    const data = await wallet.getBalance({
      address: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
      contractAddress: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9',
    });

    expect(typeof data).toBe('object');
  });

  it('transfer', async () => {
    const data = await wallet.transfer({
      recipientAddress: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
      privateKey: '0x3e241f7e6edcd5bf3a86de1f6588e70a3b89dcac8b3396f8f74572e8d5d370b2',
      amount: 0.005,
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    });

    expect(typeof data).toBe('object');

    await sleep(15000);
  });

  it('transfer Token', async () => {
    const data = await wallet.transfer({
      recipientAddress: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
      privateKey: '0x3e241f7e6edcd5bf3a86de1f6588e70a3b89dcac8b3396f8f74572e8d5d370b2',
      amount: 1,
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      contractAddress: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9',
    });

    expect(typeof data).toBe('object');
  });

  it('Get transaction', async () => {
    const receipt = await wallet.getTransaction({
      hash: '0x0ca5f18c5fcb36ec0de5fcd5e5e4f44f880a47b72caec80b24719ba34620c1fc',
    });

    expect(typeof receipt).toBe('object');
  });

  it('get ERC20 token info', async () => {
    const data = await wallet.getTokenInfo({
      contractAddress: '0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2',
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    });

    expect(typeof data).toBe('object');
    expect(typeof (data && data.name)).toBe('string');
    expect(typeof (data && data.symbol)).toBe('string');
    expect(typeof (data && data.decimals)).toBe('bigint');
    expect(typeof (data && data.totalSupply)).toBe('string');
  });

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

    console.log(data);

    expect(typeof data).toBe('object');
  });
});
