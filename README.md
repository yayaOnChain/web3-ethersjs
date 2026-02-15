# Web3 Vault Dashboard

A modern, secure Web3 application built with React and Ethers.js that enables users to manage their cryptocurrency assets through an intuitive dashboard. The platform supports token deposits, withdrawals, and transfers with seamless wallet integration.

## ✨ Features

- **Multi-Token Support**: Interact with various ERC-20 tokens including USDC, DAI, USDT, and WETH
- **Secure Vault System**: Deposit and store tokens in a smart contract vault
- **Wallet Integration**: Connect via MetaMask with support for multiple networks
- **Real-time Balances**: Monitor both vault and wallet balances instantly
- **Cross-Network Compatibility**: Support for Ethereum Mainnet and Sepolia Testnet
- **Asset Transfer**: Direct token and ETH transfers between addresses
- **Responsive Design**: Works seamlessly across devices with Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: React 19 with TypeScript
- **Blockchain**: Ethers.js v6 for Web3 interactions
- **Styling**: Tailwind CSS for responsive UI
- **Smart Contracts**: Vault and ERC-20 ABIs integrated
- **Build Tool**: Vite for fast development
- **Package Manager**: npm

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask browser extension

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd web3-ethersjs
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## 🔧 Configuration

### Network Setup

The application supports multiple networks out of the box:

- **Sepolia Testnet** (default for development)
- **Ethereum Mainnet**

To configure custom token addresses:

1. Navigate to `src/contracts/addresses.ts`
2. Update the `NETWORK_CONFIG` object with your deployed contract addresses
3. Modify supported tokens as needed

### Environment Variables

Currently, the application uses hardcoded addresses. For production deployment:

1. Create a `.env` file in the root directory
2. Add your Infura/Alchemy API keys:
```
VITE_INFURA_KEY=your_infura_key_here
```

## 📋 Usage Guide

### Connecting Wallet

1. Click "Connect MetaMask" button
2. Approve connection in your MetaMask extension
3. Select your preferred account

### Depositing Tokens

1. Navigate to the "Vault" tab
2. Select the token you wish to deposit
3. Enter the amount
4. Confirm the transaction in MetaMask

### Withdrawing Tokens

1. Go to the "Vault" tab
2. Select the token to withdraw
3. Enter withdrawal amount
4. Confirm the transaction in MetaMask

### Transferring Assets

1. Switch to the "Transfer" tab
2. Choose between ERC-20 token or ETH transfer
3. Enter recipient address and amount
4. Confirm the transaction in MetaMask

## 🏗 Architecture

### Components

- `VaultDashboard`: Main dashboard component managing tabs and state
- `VaultTabContent`: Handles deposit and withdrawal operations
- `TransferTabContent`: Manages asset transfers
- `TokenBalanceRow`: Displays individual token balances

### Hooks

- `useWeb3`: Manages wallet connection and network switching
- `useVault`: Interacts with the vault smart contract
- `useERC20`: Handles ERC-20 token operations
- `useERC20Balance`: Tracks token balances

### Contracts

- `VAULT_ABI`: Interface for vault operations (deposit, withdraw)
- `ERC20_ABI`: Standard ERC-20 token interface
- `addresses.ts`: Network-specific contract addresses

## 🧪 Testing

To test the application:

1. Start the development server:
```bash
npm run dev
```

2. Manually test all features:
   - Wallet connection
   - Token deposits and withdrawals
   - Asset transfers
   - Network switching
   - Error handling

For development, ensure all components render correctly and transactions execute as expected on test networks before deploying to mainnet.

## 🚀 Deployment

### Building for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized assets ready for deployment.

### Recommended Hosting

- Vercel: `vercel deploy`
- Netlify: Upload `dist/` folder
- AWS S3: Configure static hosting

## 🛡️ Security Considerations

- Always verify recipient addresses before transferring assets
- Use test networks for initial validation
- Implement proper error handling for failed transactions
- Regularly audit smart contracts before production use
- Enable two-factor authentication on wallet accounts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please open an issue in the repository or contact the development team.

---

<div align="center">

Made with ❤️ using React, Ethers.js, and Tailwind CSS

</div>
