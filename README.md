# Crypto Wallet SDK

A multi-chain crypto wallet SDK focused on EVM first. This SDK is designed for building bots, services, and backends that can **generate wallets, check balances, send transactions, estimate gas, and interact with smart contracts**.

> ⚠️ This project is under active development. APIs may change.

---

## ✨ Features

- 🔐 Generate wallets (mnemonic / private key)
- 💰 Get balance (native coin & token)
- 🔁 Transfer native coin or token
- 🧾 Send transaction
- ⛽ Gas estimation (Legacy & EIP-1559)
- 📜 Smart contract call (read & write)
- 🔍 Get transaction & receipt
- 🧱 Modular architecture (ready for multi-chain)

---

## ⛓️ Supported Chains

| Chain        | Network Type | Status        | Notes                         |
|-------------|--------------|---------------|-------------------------------|
| Ethereum     | EVM          | ✅ Supported   | Mainnet, Sepolia, etc         |
| BSC          | EVM          | ✅ Supported   | Compatible with EVM adapter   |
| Arbitrum     | EVM          | 🟡 Tested      | Compatible with EVM adapter   |
| Optimism     | EVM          | 🟡 Tested      | Compatible with EVM adapter   |
| Base         | EVM          | 🟡 Tested      | Compatible with EVM adapter   |
| Polygon      | EVM          | 🟡 Tested      | Compatible with EVM adapter   |
| Solana       | Non-EVM      | 🟡 Planned     | Separate adapter              |
| Bitcoin      | Non-EVM      | ✅ Supported   | UTXO adapter available         |
| Tron         | Non-EVM      | 🟡 Planned     | Separate adapter              |
| Dogecoin     | Non-EVM      | ✅ Supported   | UTXO adapter available         |

Legend:
- ✅ Supported = Already implemented / usable
- 🟡 Planned = In roadmap
- 🔴 Not supported = Not in scope (yet)

---

## 📦 Installation

```bash
npm install
```

or if published later:

```bash
npm i @reactmore/crypto-wallet-sdk
```

---

## 🚀 Quick Start

```ts
import { CryptoClientSdk } from "@reactmore/crypto-wallet-sdk";

const client = new CryptoClientSdk({
  network: "EVM",
  chainId: "11155111", // Sepolia
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
});

const wallet = client.getWallet();
```

---

## 🔐 Generate Wallet

```ts
const res = await wallet.generateWallet({});
console.log(res);
// { address, publicKey, privateKey }
```

---

## 💰 Get Balance

### Native Coin

```ts
const res = await wallet.getBalance({
  address: "0xYourAddressHere",
});
console.log(res);
```

### ERC20 Token

```ts
const res = await wallet.getBalance({
  address: "0xYourAddressHere",
  contractAddress: "0xTokenContractAddress",
});
console.log(res);
```

---

## 🔁 Transfer (Native / ERC20)

### Native Transfer

```ts
const res = await wallet.transfer({
  recipientAddress: "0xRecipient",
  privateKey: "0xYourPrivateKey",
  amount: 0.01,
});
console.log(res);
```

### With Custom Memo (data)

```ts
const res = await wallet.transfer({
  recipientAddress: "0xRecipient",
  privateKey: "0xYourPrivateKey",
  amount: 0.005,
  gasPrice: "20", // gwei (legacy example)
  data: "Payment for services",
});
console.log(res);
```

### ERC20 Transfer

```ts
const res = await wallet.transfer({
  recipientAddress: "0xRecipient",
  privateKey: "0xYourPrivateKey",
  amount: 10,
  contractAddress: "0xTokenContract",
});
console.log(res);
```

---

## ⛽ Estimate Gas

```ts
const res = await wallet.estimateGas({
  recipientAddress: "0xRecipient",
  amount: "0.01",
  data: "optional memo",
});
console.log(res);
```

Supports:
- Legacy gas model
- EIP-1559 (maxFeePerGas & maxPriorityFeePerGas)

---

## 📜 Smart Contract Call

### Read

```ts
const res = await wallet.smartContractCall({
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  contractAddress: "0xContract",
  method: "balanceOf",
  methodType: "read",
  params: ["0xAddress"],
  contractAbi: [...],
});
console.log(res);
```

### Write

```ts
const res = await wallet.smartContractCall({
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  contractAddress: "0xContract",
  method: "transfer",
  methodType: "write",
  params: ["0xTo", "1000000"],
  contractAbi: [...],
  privateKey: "0xYourPrivateKey",
});
console.log(res);
```

---

## 🔍 Get Transaction

```ts
const res = await wallet.getTransaction({
  hash: "0xTxHash",
  withReceipt: true,
});

console.log(res);
// {
//   transaction,
//   receipt,
//   memo
// }
```

If the transaction contains `data`, `memo` will be automatically decoded (UTF-8).

---

## ₿ Bitcoin (BTC) Usage

BTC wallet now supports:
- Generate wallet
- Get balance
- Transfer BTC
- Get transactions by address

```ts
const btcClient = new CryptoClientSdk({
  network: "BTC",
  // optional: cluster: "testnet"
});

const btcWallet = btcClient.getWallet();

const balance = await btcWallet.getBalance({
  address: "bc1...",
});

const txs = await btcWallet.getTransactions({
  address: "bc1...",
  limit: 10,
});

const transfer = await btcWallet.transfer({
  privateKey: "L...",
  recipientAddress: "bc1...",
  amount: 0.0001,
  fee: 10000, // satoshi (optional, default 10000)
  subtractFee: false, // optional
});

const tx = await btcWallet.getTransaction({
  hash: "<btc_tx_hash>",
});
```

---

## 🧩 Architecture

- `BaseWallet` → Common wallet interface
- `EvmWallet` → EVM implementation (Ethereum, BSC, Arbitrum, etc)
- `utils` → Unit conversion (parseEther, formatEther, parseGwei, etc)
- Future chains will live in their own adapters:
  - `SolanaWallet`
  - `BitcoinWallet`
  - `TronWallet`
  - etc.

---

## 🛣️ Roadmap

- [ ] EVM: Event listener / incoming transfer watcher
- [ ] EVM: Token transfer history helper
- [ ] Solana adapter
- [ ] Bitcoin adapter (UTXO)
- [ ] Webhook / hook integration
- [ ] Better typings & docs

---

## ⚠️ Disclaimer

This SDK does **NOT** manage private key security for you.  
You are responsible for:
- Storing private keys securely
- Managing RPC reliability
- Handling reorgs, retries, and confirmations

Use at your own risk in production.

---

## 📄 License

MIT
