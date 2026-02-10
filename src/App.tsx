import { useState, useEffect } from "react";
import { ethers } from "ethers";

// Defining a custom window interface to include 'ethereum' object injected by wallets
interface WindowWithEthereum extends Window {
  ethereum?: any;
}

declare const window: WindowWithEthereum;

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const connectWallet = async () => {
    setError(null);

    // 1. Check if MetaMask or any EIP-1193 provider is installed
    if (!window.ethereum) {
      setError("Please install MetaMask or another Web3 wallet.");
      return;
    }

    try {
      setIsConnecting(true);

      // 2. Request account access from the wallet
      // This triggers the MetaMask popup
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // 3. Setup Ethers Provider
      // We use BrowserProvider for ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);

      // 4. Update state with the first account found
      setAccount(accounts[0]);

      console.log("Connected to:", accounts[0]);
    } catch (err: any) {
      // Handle user rejection or other errors
      if (err.code === 4001) {
        setError("Connection request was rejected by user.");
      } else {
        setError("An unexpected error occurred.");
      }
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  // 5. Listen for account or network changes (Best Practice)
  useEffect(() => {
    if (window.ethereum) {
      // Reload page or update state if user switches accounts in the wallet
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      });

      // Recommended to reload the page on chain change to avoid state inconsistencies
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    // Clean up listeners on unmount
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", () => {});
        window.ethereum.removeListener("chainChanged", () => {});
      }
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">Web3 Auth</h2>

      {account ? (
        <div className="space-y-2">
          <p className="text-green-600 font-medium">Status: Connected</p>
          <p className="text-sm bg-gray-100 p-2 rounded break-all">
            Address: <strong>{account}</strong>
          </p>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}

      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default App;
