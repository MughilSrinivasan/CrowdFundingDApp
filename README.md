# DeCrowdFund - Decentralized Crowdfunding DApp

## Introduction
This project implements a **decentralized crowdfunding application (DApp)** built on the **Ethereum blockchain**.  
It enables creators to raise funds directly from contributors without intermediaries, ensuring **trustless, transparent, and censorship-resistant** operations.  

All campaign logic, including creation, donation, refund, and fund withdrawal, is governed by a **Solidity smart contract**, deployed locally using **Truffle** and **Ganache**.  
The **React + Web3.js** frontend connects users to the blockchain via **MetaMask**.

---

## Tech Stack
| Component | Technology | Purpose |
|------------|-------------|----------|
| **Blockchain** | Ethereum (via Ganache) | Local blockchain network |
| **Smart Contract** | Solidity | Defines crowdfunding logic |
| **Framework** | Truffle Suite | Compiles, deploys, and manages contracts |
| **Frontend** | React + Web3.js | Connects users to blockchain |
| **Wallet** | MetaMask | Manages user accounts & signs transactions |

- **Smart Contract (`CrowdFunding.sol`)** — Implements campaign logic: creation, donations, refunds, withdrawals, and ratings.  
- **Blockchain (Ganache)** — Simulates the Ethereum network locally for testing and execution.  
- **Frontend (React + Web3.js)** — Displays campaigns and interacts with the blockchain.  
- **MetaMask** — Connects the browser to the local blockchain and signs transactions securely.

---

## Features
### Campaign Management
- Create campaigns with a title, description, goal, and duration.  
- Update title, description, goal, and extend deadlines.  
- Cancel campaign (automatically refunds all donors).

### Funding & Community
- Donate to active campaigns using Ether.  
- View all donors and amounts.  
- Rate campaigns to build community trust.

### Financial Logic
- **Withdraw Funds** — Campaign owners withdraw collected funds after the deadline.  
- **Claim Refund** — Donors can refund their funding.  
- **Transparency** — All campaign and donor data publicly visible.

---

## How to Run the Project

### 1. Install Dependencies
Ensure the following are installed:
- **[Node.js](https://nodejs.org/)** – JavaScript runtime  
- **[Truffle](https://trufflesuite.com/docs/truffle/quickstart/)** – Smart contract development framework  
```
npm install -g truffle
````

* **[Ganache](https://trufflesuite.com/ganache/)** – Local Ethereum blockchain - Using Ganache CLI
```
npm install -g ganache
````
* **[MetaMask](https://metamask.io/)** – Browser wallet extension
* **Web3.js** – Used in the frontend for blockchain interaction
```
npm install web3
```

---

### 2. Start Local Blockchain (Ganache)

1. In a terminal, run ganache
```
ganache --networkId 5777 --port 8545
```
2. Note the **RPC URL**, **Network ID**, and **Accounts**, which are used to connect MetaMask to this local blockchain.

---

### 3. Compile & Deploy Smart Contract

Inside the DappCrowdFunding folder, run:

```
truffle migrate --network development
```

This:

* Compiles `CrowdFunding.sol`
* Deploys it to Ganache
* Saves deployment details (ABI & address) in `build/contracts/CrowdFunding.json`
* Copy the `.json` file inside the **client/src** folder, and rename to _CrowdFundingABI.json_.

---

### 4. Connect MetaMask to Ganache

1. Open MetaMask → Networks → **Add Network → Localhost 8545**
2. Import private keys from Ganache accounts to MetaMask.
3. The wallet is now connected to the local blockchain.

---

### 5. Run the Frontend (Crowdfunding App)

1. Go to the frontend folder (client):

   ```
   cd client
   npm install
   npm start
   ```
2. The app will open in the browser.
3. MetaMask will ask to connect → approve the connection.
4. We can now:

   * Create campaigns and edit them.
   * Donate
   * Withdraw or refund
   * Rate campaigns

---

### 6. Ganache Account Viewer

Another small React app is included to **view all Ethereum account balances** from the local Ganache blockchain.

### Features:

* Connects directly to Ganache at `http://127.0.0.1:8545`
* Fetches and displays all account addresses and ETH balances.

### How to Run:

```
cd eth-balance-viewer
npm install
npm start
```

A table listing all Ganache accounts and their current Ether balances is rendered.

