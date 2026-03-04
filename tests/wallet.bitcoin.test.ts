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
      addressType: "segwit_taproot" // | "segwit_native" | "segwit_nested" | "segwit_taproot"

    });
    console.log(data);

    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('address');
    expect(data).toHaveProperty('publicKey');
    expect(data).toHaveProperty('privateKey');
  });

  it('getBalance', async () => {
    const data = await wallet.getBalance({
      address: '2NAhbS79dEUeqcnbC27UppwnjoVSwET5bat',
    });

    console.log(data);

    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('balance');
  });
});
