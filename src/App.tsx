import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// Defining a custom window interface to include 'ethereum' object injected by wallets
interface WindowWithEthereum extends Window {
  ethereum?: any;
}

declare const window: WindowWithEthereum;

interface TokenData {
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
}

// Minimal ABI for reading ERC20 data
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// Example: LINK Token on Ethereum Mainnet
const CONTRACT_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * CORE: Read Contract Data Logic
   * Fetches token information and user balance
   */
  const fetchContractData = useCallback(async (userAddress: string) => {
    try {
      setLoading(true);
      // Initialize provider from window.ethereum
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Create contract instance (Read-only)
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ERC20_ABI,
        provider,
      );

      // Execute calls in parallel for performance
      const [name, symbol, decimals, balance] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.balanceOf(userAddress),
      ]);

      setTokenData({
        name,
        symbol,
        decimals: Number(decimals),
        balance: ethers.formatUnits(balance, decimals),
      });
    } catch (err) {
      console.error("Failed to fetch contract data:", err);
      setError("Failed to load token information.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Wallet Connection Logic
   */
  const connectWallet = async () => {
    setError(null);
    if (!window.ethereum) {
      setError("Please install MetaMask.");
      return;
    }

    try {
      setLoading(true);
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0]);
      // Immediately fetch data after successful connection
      await fetchContractData(accounts[0]);
    } catch (err: any) {
      if (err.code === 4001) setError("Connection rejected.");
      else setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Listeners for Account/Network changes
   */
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchContractData(accounts[0]);
        } else {
          setAccount(null);
          setTokenData(null);
        }
      });

      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      window.ethereum?.removeAllListeners();
    };
  }, [fetchContractData]);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border border-gray-100 rounded-xl shadow-lg bg-white">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Web3 Dashboard</h2>

      {!account ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="space-y-6">
          {/* Wallet Info Section */}
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-bold">
              Connected Wallet
            </p>
            <p className="text-sm font-mono truncate">{account}</p>
          </div>

          {/* Contract Data Section */}
          <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-3">
              Token Information
            </h3>
            {loading && !tokenData ? (
              <p className="text-sm animate-pulse">Loading contract data...</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Asset</p>
                  <p className="font-bold">
                    {tokenData?.name} ({tokenData?.symbol})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Your Balance</p>
                  <p className="font-bold text-green-600">
                    {tokenData?.balance}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
