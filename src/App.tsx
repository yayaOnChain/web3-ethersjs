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

  // New state for transaction status
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * CORE: Write Transaction with Gas Estimation
   */
  const handleTransfer = async () => {
    if (!window.ethereum) return;

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      // Initialize Provider and Signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(); // Required for "Write" operations

      // Create Contract instance with Signer
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          ...ERC20_ABI,
          "function transfer(address to, uint256 amount) returns (bool)", // Adding write function to ABI
        ],
        signer,
      );

      // Define parameters
      const recipient = "0x0000000000000000000000000000000000000000"; // Example: Burn address or other wallet
      const amount = ethers.parseUnits("0.1", tokenData?.decimals || 18);

      // --- GAS ESTIMATION STRATEGY ---

      // Estimate gas for the specific transaction
      // This simulates the call on the EVM without spending real ETH
      console.log("Estimating gas...");
      const estimatedGas = await contract.transfer.estimateGas(
        recipient,
        amount,
      );

      // Add a 20% Safety Buffer
      // Use BigInt (n) for arithmetic with gas units
      const gasLimitWithBuffer = (estimatedGas * 120n) / 100n;

      console.log(`Gas Estimated: ${estimatedGas.toString()}`);
      console.log(`Gas Limit with Buffer: ${gasLimitWithBuffer.toString()}`);

      // Execute Transaction with manual gasLimit
      const tx = await contract.transfer(recipient, amount, {
        gasLimit: gasLimitWithBuffer,
      });

      // Transaction Sent (Waiting for mining)
      setTxHash(tx.hash);
      console.log("Transaction sent! Hash:", tx.hash);

      // Wait for confirmation (1 block)
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        alert("Transfer Successful with manual gas limit!");
        // Refresh balance after successful transfer
        if (account) fetchContractData(account);
      } else {
        throw new Error("Transaction failed on-chain");
      }
    } catch (err: any) {
      console.error("Transfer error:", err);

      // Handle specific Gas/Revert errors
      if (err.code === "INSUFFICIENT_FUNDS") {
        setError("You don't have enough ETH for gas fees.");
      } else if (err.code === "ACTION_REJECTED") {
        setError("Transaction rejected by user.");
      } else {
        setError("Gas estimation failed. The transaction might revert.");
      }
    } finally {
      setLoading(false);
    }
  };

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

      {account && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            {loading ? "Estimating & Sending..." : "Transfer with Gas Buffer"}
          </button>

          {txHash && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-[10px] text-blue-800 font-bold uppercase">
                Transaction Sent
              </p>
              <p className="text-[10px] font-mono break-all text-blue-600">
                {txHash}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-md border border-red-100">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default App;
