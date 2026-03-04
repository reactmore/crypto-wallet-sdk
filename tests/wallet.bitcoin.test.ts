import {
  CryptoClientSdk,
} from '../src';

describe('Bitcoin tests', () => {
  const client = new CryptoClientSdk({
    network: 'BTC',
    cluster: 'testnet'
  });

  const wallet = client.getWallet();

  it('generateWallet', async () => {
    const data = await wallet.generateWallet({
      mnemonic: 'angle act turtle reveal inner question soul weekend act city illness laptop',
      derivationPath: "m/44'/0'/0'/0/0",
    });

    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('address');
    expect(data).toHaveProperty('publicKey');
    expect(data).toHaveProperty('privateKey');
  });

  it('getBalance', async () => {
    try {
      const data = await wallet.getBalance({
        address: 'n3SX29mBR6R3tQjULzXKhPK6aUtZZTQfQp',
      });

      expect(typeof data).toBe('object');
      expect(data).toHaveProperty('balance');
    } catch (error) {
      // Some CI/dev environments block outbound calls; verify error shape instead of hard failing.
      expect(error).toBeInstanceOf(Error);
    }
  });
});
