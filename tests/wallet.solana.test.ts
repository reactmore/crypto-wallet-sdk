import {
  CryptoClientSdk,
} from '../src';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Solana tests', () => {
  const client = new CryptoClientSdk({
    network: "SOL",
    rpcUrl: 'https://api.mainnet-beta.solana.com/',
    // rpcUrl: 'https://api.devnet.solana.com',
    // rpcUrl: 'https://api.testnet.solana.com',
  });

  const wallet = client.getWallet();

  it('generateMnemonic from Base', async () => {
    const mnemonic = await wallet.generateMnemonic(12);

    expect(typeof mnemonic).toBe('string');
  });

  it('generateWallet', async () => {
    const data = await wallet.generateWallet({
      mnemonic: "angle act turtle reveal inner question soul weekend act city illness laptop",
    });

    expect(typeof data).toBe('object');
  });

  it('getBalance', async () => {
    const data = await wallet.getBalance({
      address: "ERLHJ9rPakpdvC4raegrzWZ8n1Acv4tvyiAPqArebdZm",
    });

    console.log(data);

    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('balance');
    expect(typeof data.balance).toBe('number');
  });

  it('getBalance SPL token balance', async () => {
    const data = await wallet.getBalance({
      address: 'ERLHJ9rPakpdvC4raegrzWZ8n1Acv4tvyiAPqArebdZm',
      contractAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    });

    console.log(data);

    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('balance');
    expect(typeof data.balance).toBe('number');
  });

  it('transfer', async () => {
    const data = await wallet.transfer({
      recipientAddress: 'ERLHJ9rPakpdvC4raegrzWZ8n1Acv4tvyiAPqArebdZm',
      amount: 0.0001,
      privateKey: '5nkCSFBvaz5FWi4iWWQz9sYPWPEkn5yfL6DcH5Ze4BrMUtYwMAzdqbjTBBNEY6wYSAB5u29z9T2dM27MSpSEhyd5',
    });

    expect(typeof data).toBe('object');
    await sleep(15000);
  });

  it('transfer Token', async () => {
    const data = await wallet.transfer({
      recipientAddress: 'ERLHJ9rPakpdvC4raegrzWZ8n1Acv4tvyiAPqArebdZm',
      amount: 1,
      privateKey: '5nkCSFBvaz5FWi4iWWQz9sYPWPEkn5yfL6DcH5Ze4BrMUtYwMAzdqbjTBBNEY6wYSAB5u29z9T2dM27MSpSEhyd5',
      contractAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    });

    expect(typeof data).toBe('object');
  });

  it('get SPL token info', async () => {
    const data = await wallet.getTokenInfo({
      contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      cluster: 'mainnet-beta'
    });

    expect(typeof data).toBe('object');
    expect(typeof (data && data.name)).toBe('string');
    expect(typeof (data && data.symbol)).toBe('string');
    expect(typeof (data && data.decimals)).toBe('number');
    expect(typeof (data && data.totalSupply)).toBe('string');
  });
});
