import React, { useState, useEffect } from "react";
import { useWeb3, SUPPORTED_NETWORKS } from "../hooks/useWeb3";
import {
  useERC20,
  useERC20Balance,
  useERC20Transfer,
  type TokenInfo,
} from "../hooks/useERC20";
import { useVault, type VaultBalance } from "../hooks/useVault";
import { shortenAddress } from "../utils/format";
import { getContractAddresses } from "../contracts/addresses";
import { formatEther } from "ethers";

const VaultDashboard: React.FC = () => {
  const {
    account,
    isConnected,
    connectWallet,
    chainId,
    network,
    switchNetwork,
  } = useWeb3();

  const {
    isPaused,
    getAllBalances,
    deposit,
    withdraw,
    loading: vaultLoading,
  } = useVault();

  const {
    transfer,
    transferETH,
    loading: transferLoading,
    error: transferError,
    success: transferSuccess,
  } = useERC20Transfer();

  const [activeTab, setActiveTab] = useState<"vault" | "transfer">("vault");
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferToAddress, setTransferToAddress] = useState<string>("");
  const [transferType, setTransferType] = useState<"token" | "eth">("token");
  const [vaultBalances, setVaultBalances] = useState<VaultBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get supported tokens based on network
  const supportedTokens = chainId
    ? getContractAddresses(chainId).supportedTokens
    : {};

  // Fetch vault balances when account or chain changes
  useEffect(() => {
    if (isConnected && Object.keys(supportedTokens).length > 0) {
      loadVaultBalances();
    }
  }, [isConnected, chainId]);

  const loadVaultBalances = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tokenAddresses = Object.values(supportedTokens) as string[];
      const balances = await getAllBalances(tokenAddresses);
      setVaultBalances(balances);
    } catch (err) {
      console.error("Failed to load vault balances:", err);
      setError(err instanceof Error ? err.message : "Failed to load balances");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken || !depositAmount) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await deposit(selectedToken, depositAmount);
      setSuccessMessage(`✅ Successfully deposited ${depositAmount} tokens!`);
      setDepositAmount("");
      loadVaultBalances();
    } catch (err) {
      console.error("Deposit error:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken || !withdrawAmount) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await withdraw(selectedToken, withdrawAmount);
      setSuccessMessage(`✅ Successfully withdrawn ${withdrawAmount} tokens!`);
      setWithdrawAmount("");
      loadVaultBalances();
    } catch (err) {
      console.error("Withdraw error:", err);
      setError(err instanceof Error ? err.message : "Withdraw failed");
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (transferType === "eth") {
      // Transfer ETH
      if (!transferToAddress || !transferAmount) return;

      try {
        setError(null);
        setSuccessMessage(null);

        await transferETH(transferToAddress, transferAmount);
        setSuccessMessage(`✅ ETH transfer successful!`);
        setTransferAmount("");
        setTransferToAddress("");
      } catch (err) {
        console.error("ETH Transfer error:", err);
        setError(err instanceof Error ? err.message : "ETH Transfer failed");
      }
    } else {
      // Transfer Token
      if (!selectedToken || !transferToAddress || !transferAmount) return;

      const tokenInfo = await getTokenInfo(selectedToken);
      if (!tokenInfo) return;

      try {
        setError(null);
        setSuccessMessage(null);

        await transfer(
          selectedToken,
          transferToAddress,
          transferAmount,
          tokenInfo.decimals,
        );
        setSuccessMessage(`✅ ${tokenInfo.symbol} transfer successful!`);
        setTransferAmount("");
        setTransferToAddress("");
      } catch (err) {
        console.error("Token Transfer error:", err);
        setError(err instanceof Error ? err.message : "Token Transfer failed");
      }
    }
  };

  const getTokenInfo = async (
    tokenAddress: string,
  ): Promise<TokenInfo | null> => {
    const { useERC20 } = await import("../hooks/useERC20");
    const { tokenInfo } = useERC20(tokenAddress);
    return tokenInfo;
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error("Connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchNetwork(targetChainId);
    } catch (err) {
      console.error("Failed to switch network:", err);
      setError(err instanceof Error ? err.message : "Failed to switch network");
    }
  };

  // Network Badge Component
  const NetworkBadge = () => {
    if (!network) return null;

    const isSupported =
      SUPPORTED_NETWORKS[network.chainId]?.isSupported ?? false;
    const badgeColor = isSupported
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
    const badgeText = isSupported ? "Supported" : "Unsupported";

    return (
      <div className="flex items-center gap-2">
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}
        >
          {network.name}
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
          {badgeText}
        </div>
        {!isSupported && (
          <button
            onClick={() => handleSwitchNetwork(11155111)} // Switch to Sepolia
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
          >
            Switch to Sepolia
          </button>
        )}
      </div>
    );
  };

  // Network Details Panel Component
  const NetworkDetailsPanel: React.FC = () => {
    const { account, chainId, network, provider } = useWeb3();
    const [networkDetailsInfo, setNetworkDetailsInfo] = useState<any>(null);

    useEffect(() => {
      const fetchNetworkDetailsInfo = async () => {
        if (!provider || !account || !chainId) return;

        try {
          // Get ETH balance
          const ethBalance = await provider.getBalance(account);

          setNetworkDetailsInfo({
            account,
            chainId,
            networkName: network?.name,
            ethBalance: parseFloat(formatEther(ethBalance)).toFixed(6),
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error("Network Details fetch error:", err);
        }
      };

      fetchNetworkDetailsInfo();
    }, [provider, account, chainId, network]);

    if (!networkDetailsInfo) return null;

    return (
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <details className="cursor-pointer">
          <summary className="font-semibold text-sm text-gray-600 hover:text-gray-900">
            🔍 Network Details Information (Click to expand)
          </summary>
          <div className="mt-2 text-xs text-gray-700 space-y-1">
            <div>
              <span className="font-medium">Account:</span>{" "}
              {networkDetailsInfo.account}
            </div>
            <div>
              <span className="font-medium">Chain ID:</span>{" "}
              {networkDetailsInfo.chainId}
            </div>
            <div>
              <span className="font-medium">Network:</span>{" "}
              {networkDetailsInfo.networkName}
            </div>
            <div>
              <span className="font-medium">ETH Balance:</span>{" "}
              {networkDetailsInfo.ethBalance} ETH
            </div>
            <div>
              <span className="font-medium">Timestamp:</span>{" "}
              {networkDetailsInfo.timestamp}
            </div>
          </div>
        </details>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Connect Wallet
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Connect your wallet to access the vault and transfer tokens
          </p>
          <button
            onClick={handleConnectWallet}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Token Vault & Transfer
              </h1>
              <p className="text-gray-600 mt-1">Manage your assets securely</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Connected:</div>
              <div className="font-mono font-semibold">
                {shortenAddress(account!)}
              </div>
            </div>
          </div>

          {/* Network Information */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Current Network
                  </div>
                  <NetworkBadge />
                </div>
              </div>
              {chainId && (
                <div className="text-sm text-gray-600">Chain ID: {chainId}</div>
              )}
            </div>

            {/* Network Details Panel */}
            <NetworkDetailsPanel />
          </div>

          {isPaused && (
            <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
              <p className="text-yellow-700 font-semibold">
                ⚠️ Vault is currently paused for maintenance
              </p>
            </div>
          )}
        </div>

        {/* Error & Success Messages */}
        {(error || transferError) && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700 font-medium">{error || transferError}</p>
          </div>
        )}

        {(successMessage || transferSuccess) && (
          <div className="mb-4 bg-green-100 border-l-4 border-green-500 p-4 rounded">
            <p className="text-green-700 font-medium">
              {successMessage || transferSuccess}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("vault")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "vault"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                🏦 Vault
              </button>
              <button
                onClick={() => setActiveTab("transfer")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "transfer"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                💸 Transfer
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "vault" ? (
              <VaultTabContent
                vaultBalances={vaultBalances}
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                withdrawAmount={withdrawAmount}
                setWithdrawAmount={setWithdrawAmount}
                supportedTokens={supportedTokens}
                isPaused={isPaused}
                vaultLoading={vaultLoading || isLoading}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
              />
            ) : (
              <TransferTabContent
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
                transferAmount={transferAmount}
                setTransferAmount={setTransferAmount}
                transferToAddress={transferToAddress}
                setTransferToAddress={setTransferToAddress}
                transferType={transferType}
                setTransferType={setTransferType}
                supportedTokens={supportedTokens}
                transferLoading={transferLoading}
                onTransfer={handleTransfer}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Vault Tab Content Component
interface VaultTabContentProps {
  vaultBalances: VaultBalance[];
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (amount: string) => void;
  supportedTokens: Record<string, string>;
  isPaused: boolean;
  vaultLoading: boolean;
  onDeposit: (e: React.FormEvent) => void;
  onWithdraw: (e: React.FormEvent) => void;
}

const VaultTabContent: React.FC<VaultTabContentProps> = ({
  vaultBalances,
  selectedToken,
  setSelectedToken,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  supportedTokens,
  isPaused,
  vaultLoading,
  onDeposit,
  onWithdraw,
}) => {
  return (
    <>
      {/* Vault Balances */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Your Vault Balances</h2>

        {vaultLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading balances...</p>
          </div>
        ) : vaultBalances.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No tokens in vault yet
          </p>
        ) : (
          <div className="space-y-3">
            {vaultBalances.map((balance) => (
              <TokenBalanceRow
                key={balance.tokenAddress}
                balance={balance}
                onTokenSelect={setSelectedToken}
              />
            ))}
          </div>
        )}
      </div>

      {/* Deposit & Withdraw Forms */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Deposit Form */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
            <span>📥</span> Deposit
          </h2>
          <form onSubmit={onDeposit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isPaused}
              >
                <option value="">Select Token</option>
                {Object.entries(supportedTokens).map(([name, address]) => (
                  <option key={address} value={address}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isPaused}
                min="0"
                step="any"
              />
            </div>

            <button
              type="submit"
              disabled={
                !selectedToken || !depositAmount || isPaused || vaultLoading
              }
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {vaultLoading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                "Deposit"
              )}
            </button>
          </form>
        </div>

        {/* Withdraw Form */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
            <span>📤</span> Withdraw
          </h2>
          <form onSubmit={onWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isPaused}
              >
                <option value="">Select Token</option>
                {Object.entries(supportedTokens).map(([name, address]) => (
                  <option key={address} value={address}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isPaused}
                min="0"
                step="any"
              />
            </div>

            <button
              type="submit"
              disabled={
                !selectedToken || !withdrawAmount || isPaused || vaultLoading
              }
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {vaultLoading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                "Withdraw"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

// Transfer Tab Content Component
interface TransferTabContentProps {
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  transferAmount: string;
  setTransferAmount: (amount: string) => void;
  transferToAddress: string;
  setTransferToAddress: (address: string) => void;
  transferType: "token" | "eth";
  setTransferType: (type: "token" | "eth") => void;
  supportedTokens: Record<string, string>;
  transferLoading: boolean;
  onTransfer: (e: React.FormEvent) => void;
}

const TransferTabContent: React.FC<TransferTabContentProps> = ({
  selectedToken,
  setSelectedToken,
  transferAmount,
  setTransferAmount,
  transferToAddress,
  setTransferToAddress,
  transferType,
  setTransferType,
  supportedTokens,
  transferLoading,
  onTransfer,
}) => {
  return (
    <>
      <h2 className="text-xl font-bold mb-6 text-purple-600 flex items-center gap-2">
        <span>💸</span> Transfer Tokens or ETH
      </h2>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <form onSubmit={onTransfer} className="space-y-6">
          {/* Transfer Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setTransferType("token")}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  transferType === "token"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                🪙 ERC20 Token
              </button>
              <button
                type="button"
                onClick={() => setTransferType("eth")}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  transferType === "eth"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                ⚡ ETH
              </button>
            </div>
          </div>

          {/* Token Selection (only for token transfer) */}
          {transferType === "token" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select Token</option>
                {Object.entries(supportedTokens).map(([name, address]) => (
                  <option key={address} value={address}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={transferToAddress}
              onChange={(e) => setTransferToAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
              min="0"
              step="any"
            />
          </div>

          {/* Transfer Button */}
          <button
            type="submit"
            disabled={
              (transferType === "token" && !selectedToken) ||
              !transferToAddress ||
              !transferAmount ||
              transferLoading
            }
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {transferLoading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing Transfer...
              </>
            ) : (
              <>
                <span>🚀</span> Transfer{" "}
                {transferType === "eth" ? "ETH" : "Token"}
              </>
            )}
          </button>
        </form>

        {/* Transfer Info Box */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">
            💡 Transfer Information
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • This transfers tokens/ETH directly from your wallet (not from
              vault)
            </li>
            <li>• To transfer vault assets, withdraw first then transfer</li>
            <li>• Always double-check the recipient address</li>
            <li>• Gas fees will be charged for each transfer</li>
          </ul>
        </div>
      </div>
    </>
  );
};

// Helper Component: Token Balance Row
interface TokenBalanceRowProps {
  balance: VaultBalance;
  onTokenSelect: (tokenAddress: string) => void;
}

const TokenBalanceRow: React.FC<TokenBalanceRowProps> = ({
  balance,
  onTokenSelect,
}) => {
  const { tokenInfo } = useERC20(balance.tokenAddress);
  const { balanceDisplay, loading, error } = useERC20Balance(
    balance.tokenAddress,
    balance.tokenAddress,
  );

  // Get wallet balance for this token
  const { account } = useWeb3();
  const walletBalanceInfo = useERC20Balance(balance.tokenAddress, account);

  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer bg-white"
      onClick={() => onTokenSelect(balance.tokenAddress)}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {tokenInfo ? (
            <>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                <span className="font-bold text-white text-base">
                  {tokenInfo.symbol}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {tokenInfo.name}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span>{tokenInfo.symbol}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {tokenInfo.decimals} decimals
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-500">Loading token info...</div>
          )}
        </div>

        <div className="text-right space-y-1">
          {/* Vault Balance */}
          <div>
            <div className="text-sm text-gray-500">Vault Balance</div>
            <div className="font-bold text-lg text-gray-900">
              {loading ? (
                <span className="animate-pulse">Loading...</span>
              ) : error ? (
                <span className="text-red-500 text-sm">Error</span>
              ) : (
                `${balanceDisplay} ${tokenInfo?.symbol || ""}`
              )}
            </div>
          </div>

          {/* Wallet Balance */}
          {account && walletBalanceInfo.balanceRaw > 0n && (
            <div>
              <div className="text-sm text-gray-500">Wallet Balance</div>
              <div className="font-medium text-gray-700 text-sm">
                {walletBalanceInfo.loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${walletBalanceInfo.balanceDisplay} ${tokenInfo?.symbol || ""}`
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultDashboard;
