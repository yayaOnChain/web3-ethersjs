export const NETWORK_CONFIG = {
  // Sepolia Testnet - UPDATE THIS ACCORDING TO YOUR TOKEN ADDRESSES!
  11155111: {
    vaultAddress: "0x...", // Replace with your vault address on Sepolia

    // ⚠️ THESE ARE COMMONLY USED SEPOLIA TOKEN ADDRESSES
    // Replace with the token addresses you actually use!
    supportedTokens: {
      // USDC Sepolia (FAUCET: https://sepoliafaucet.com/)
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",

      // DAI Sepolia
      DAI: "0x2c204C811a9919E5dC4b0b975921A369b13a2d37",

      // Mock USDT Sepolia (if available)
      USDT: "0x...", // Replace with your USDT address

      // WETH Sepolia
      WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    },
  },

  // Mainnet
  1: {
    vaultAddress: "0x...",
    supportedTokens: {
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    },
  },
} as const;

export const getContractAddresses = (chainId: number) => {
  return (
    NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG] ||
    NETWORK_CONFIG[11155111]
  );
};
