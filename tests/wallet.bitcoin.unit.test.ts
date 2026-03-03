import { BtcWallet } from '../src/services/btc/wallet';

const makeWallet = () => new BtcWallet({ network: 'BTC', cluster: 'testnet' });

describe('Bitcoin wallet service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('getBalance returns formatted balances', async () => {
    const wallet = makeWallet();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chain_stats: { funded_txo_sum: 200000, spent_txo_sum: 50000 },
        mempool_stats: { funded_txo_sum: 10000, spent_txo_sum: 5000 },
      }),
    } as any);

    const result = await wallet.getBalance({ address: 'tb1qtest' });

    expect(result).toMatchObject({
      balance: 0.00155,
      confirmedBalance: 0.0015,
      unconfirmedBalance: 0.00005,
      _rawBalance: 155000,
    });
  });

  it('getTransactions returns summarized direction and amount', async () => {
    const wallet = makeWallet();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          txid: 'tx1',
          fee: 200,
          status: { confirmed: true, block_height: 100, block_time: 1710000000 },
          vin: [
            {
              prevout: {
                scriptpubkey_address: 'tb1qtest',
                value: 70000,
              },
            },
          ],
          vout: [
            { scriptpubkey_address: 'tb1qother', value: 69500 },
            { scriptpubkey_address: 'tb1qtest', value: 300 },
          ],
        },
      ]),
    } as any);

    const result = await wallet.getTransactions({ address: 'tb1qtest' });

    expect(result.transactions[0]).toMatchObject({
      hash: 'tx1',
      direction: 'out',
      amount: 0.000697,
      fee: 0.000002,
      confirmed: true,
    });
  });

  it('getTransaction returns transaction details by hash', async () => {
    const wallet = makeWallet();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        txid: 'tx-hash',
        fee: 1000,
        status: { confirmed: true, block_height: 123, block_time: 1711111 },
        vin: [{ txid: 'in1' }],
        vout: [{ value: 1000 }],
      }),
    } as any);

    const result = await wallet.getTransaction({ hash: 'tx-hash' });

    expect(result).toMatchObject({
      hash: 'tx-hash',
      fee: 0.00001,
      _rawFee: 1000,
      confirmed: true,
      blockHeight: 123,
    });
  });

  it('transfer supports explicit fee and subtractFee', async () => {
    const wallet = makeWallet() as any;

    wallet.wallet.getNewAddress = jest.fn().mockResolvedValue({ address: 'tb1qsender' });
    wallet.wallet.validAddress = jest.fn().mockResolvedValue({ isValid: true });
    wallet.wallet.signTransaction = jest.fn().mockResolvedValue('rawtxhex');

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { txid: 'u1', vout: 0, value: 120000, status: { confirmed: true } },
        ]),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'broadcasted-txid',
      } as any);

    const result = await wallet.transfer({
      privateKey: 'priv',
      recipientAddress: 'tb1qrecipient',
      amount: 0.001,
      fee: 5000,
      subtractFee: true,
    });

    expect(wallet.wallet.signTransaction).toHaveBeenCalled();
    expect(result).toMatchObject({
      txid: 'broadcasted-txid',
      amount: 0.00095,
      to: 'tb1qrecipient',
      subtractFee: true,
    });
  });
});
