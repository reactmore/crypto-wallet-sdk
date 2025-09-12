import {
  EthWallet,
} from '../src';

describe('Ethereum tests', () => {
  const ethWrapper = new EthWallet();

  it('generateWallet', async () => {
    const wallet = await ethWrapper.generateWallet({
      mnemonic: "angle act turtle reveal inner question soul weekend act city illness laptop",
      derivationPath: "m/44'/60'/0'/0/0",
    });

    console.log(wallet);

    expect(typeof wallet).toBe('object');
  });

  it('getBalance', async () => {
    const balance = await ethWrapper.getBalance({
      address: "0x2455eC6700092991Ce0782365A89d5Cd89c8Fa22",
      rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    });

    console.log(balance);

    expect(typeof balance).toBe('object');
  });

  it('getBalance ERC20 token balance', async () => {
    const data = await ethWrapper.getBalance({
      address: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    });

    expect(typeof data).toBe('object');
  });

  it('transfer', async () => {
    const data = await ethWrapper.transfer({
      recipientAddress: '0x45beeca6ebea6f99de93e39572ec62449315aa80',
      privateKey: '0x3e241f7e6edcd5bf3a86de1f6588e70a3b89dcac8b3396f8f74572e8d5d370b2',
      amount: 1,
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      contractAddress: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9',
      maxPriorityFeePerGas: '1.5',
      maxFeePerGas: '3'
    });

    console.log(data);

    expect(typeof data).toBe('object');
  });
});
