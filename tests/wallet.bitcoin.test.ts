import {
  CryptoClientSdk,
} from '../src';

describe('Bitcoin tests', () => {
  const client = new CryptoClientSdk({
    network: "BTC",
    cluster: 'testnet'
  });

  const wallet = client.getWallet();

  it('generateWallet', async () => {
    const data = await wallet.generateWallet({
      mnemonic: "angle act turtle reveal inner question soul weekend act city illness laptop",
      derivationPath: "m/44'/0'/0'/0/0",
    });

    console.log(data);

    expect(typeof data).toBe('object');
  });

  it('getBalance', async () => {
    const data = await wallet.getBalance({
      address: "n3SX29mBR6R3tQjULzXKhPK6aUtZZTQfQp",
    });

    console.log(data);

    expect(typeof data).toBe('object');

  });
});
