import { CryptoClientSdk } from '../src';

describe('Doge tests', () => {
  const client = new CryptoClientSdk({
    network: 'DOGE',
  });

  const wallet = client.getWallet();

  it('generateWallet', async () => {
    const data = await wallet.generateWallet({
      mnemonic: 'angle act turtle reveal inner question soul weekend act city illness laptop',
      derivationPath: "m/44'/3'/0'/0/0",
    });

    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('address');
    expect(data).toHaveProperty('publicKey');
    expect(data).toHaveProperty('privateKey');
  });
});
