import { useState, useEffect, useMemo } from "react";
import { Contract, formatUnits, parseUnits } from "ethers";
import { ERC20_ABI } from "../contracts/erc20ABI";
import { useWeb3 } from "./useWeb3";

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

export interface TokenBalanceInfo {
  balanceRaw: bigint;
  balanceFormatted: string;
  balanceDisplay: string; // User-friendly format
  decimals: number;
  loading: boolean;
  error: string | null;
}

export const useERC20 = (tokenAddress: string | null) => {
  const { provider } = useWeb3();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider || !tokenAddress) return;

    const fetchTokenInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

        const [name, symbol, decimals] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
        ]);

        setTokenInfo({
          name,
          symbol,
          decimals: Number(decimals),
          address: tokenAddress,
        });
      } catch (err) {
        console.error("Failed to fetch token info:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTokenInfo();
  }, [provider, tokenAddress]);

  return { tokenInfo, loading, error };
};

export const useERC20Balance = (
  tokenAddress: string | null,
  account: string | null,
): TokenBalanceInfo => {
  const { provider } = useWeb3();
  const { tokenInfo } = useERC20(tokenAddress);

  const [balanceRaw, setBalanceRaw] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debug log for troubleshooting
    console.log("🔍 useERC20Balance called:", {
      tokenAddress,
      account,
      hasProvider: !!provider,
      tokenInfo: tokenInfo?.symbol,
    });

    if (!provider || !tokenAddress || !account) {
      setBalanceRaw(0n);
      setError(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        setLoading(true);
        setError(null);

        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

        console.log(
          `📡 Fetching balance for ${account} on token ${tokenAddress}`,
        );

        const balanceResult = await tokenContract.balanceOf(account);

        console.log(`✅ Balance fetched:`, {
          raw: balanceResult.toString(),
          token: tokenInfo?.symbol,
          decimals: tokenInfo?.decimals,
        });

        setBalanceRaw(balanceResult);
      } catch (err) {
        console.error("❌ Failed to fetch balance:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setBalanceRaw(0n);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Setup event listener for real-time updates
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

    const handleTransfer = (from: string, to: string, amount: bigint) => {
      console.log("🔄 Transfer event detected:", { from, to, amount });
      if (
        from.toLowerCase() === account.toLowerCase() ||
        to.toLowerCase() === account.toLowerCase()
      ) {
        fetchBalance();
      }
    };

    tokenContract.on("Transfer", handleTransfer);

    return () => {
      tokenContract.off("Transfer", handleTransfer);
    };
  }, [provider, tokenAddress, account, tokenInfo?.decimals]);

  // Format balance with correct decimals
  const balanceFormatted = useMemo(() => {
    if (!tokenInfo) return "0";
    try {
      return formatUnits(balanceRaw, tokenInfo.decimals);
    } catch (err) {
      console.error("Format error:", err);
      return "0";
    }
  }, [balanceRaw, tokenInfo]);

  // Format display that is user-friendly
  const balanceDisplay = useMemo(() => {
    if (!tokenInfo) return "0.00";
    const num = parseFloat(balanceFormatted);
    if (num === 0) return "0.00";
    if (num < 0.0001) return "< 0.0001";
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }, [balanceFormatted, tokenInfo]);

  return {
    balanceRaw,
    balanceFormatted,
    balanceDisplay,
    decimals: tokenInfo?.decimals || 18,
    loading,
    error,
  };
};

export const useERC20Transfer = () => {
  const { signer, account } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const transfer = async (
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals: number,
  ): Promise<void> => {
    if (!signer || !account) {
      throw new Error("Wallet not connected");
    }

    if (!tokenAddress || !toAddress || !amount) {
      throw new Error("Invalid parameters");
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

      // Parse amount with correct decimals
      const amountRaw = parseUnits(amount, decimals);

      // Execute transfer
      const tx = await tokenContract.transfer(toAddress, amountRaw);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      setSuccess(`Transfer successful! Tx: ${receipt.hash}`);

      return receipt;
    } catch (err) {
      console.error("Transfer failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Transfer failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const transferETH = async (
    toAddress: string,
    amount: string,
  ): Promise<void> => {
    if (!signer || !account) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Parse ETH amount
      const amountRaw = parseUnits(amount, 18);

      // Execute ETH transfer
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: amountRaw,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      setSuccess(`ETH Transfer successful! Tx: ${receipt?.hash}`);

      // return receipt;
    } catch (err) {
      console.error("ETH Transfer failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "ETH Transfer failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { transfer, transferETH, loading, error, success };
};
