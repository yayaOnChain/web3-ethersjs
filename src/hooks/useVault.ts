import { useState, useEffect } from "react";
import { Contract, parseUnits } from "ethers";
import { VAULT_ABI } from "../contracts/vaultABI";
import { useWeb3 } from "./useWeb3";
import { getContractAddresses } from "../contracts/addresses";

export interface VaultBalance {
  tokenAddress: string;
  balanceRaw: bigint;
  balanceFormatted: string;
}

export const useVault = () => {
  const { provider, signer, account, chainId } = useWeb3();
  const [vaultContract, setVaultContract] = useState<Contract | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || !chainId) return;

    const addresses = getContractAddresses(chainId);
    setVaultAddress(addresses.vaultAddress);

    const contract = new Contract(addresses.vaultAddress, VAULT_ABI, provider);
    setVaultContract(contract);
  }, [provider, chainId]);

  // Fetch vault paused state
  useEffect(() => {
    if (!vaultContract) return;

    const fetchPausedState = async () => {
      try {
        const paused = await vaultContract.paused();
        setIsPaused(paused);
      } catch (err) {
        console.error("Failed to fetch paused state:", err);
      }
    };

    fetchPausedState();
  }, [vaultContract]);

  // Get user balance for specific token
  const getUserBalance = async (tokenAddress: string): Promise<bigint> => {
    if (!vaultContract || !account) {
      return 0n;
    }

    try {
      const balance = await vaultContract.getUserBalance(account, tokenAddress);
      return BigInt(balance);
    } catch (err) {
      console.error("Failed to get vault balance:", err);
      return 0n;
    }
  }; // Get user balance for specific token with decimals

  // Update getAllBalances to include decimals
  const getAllBalances = async (
    tokenAddresses: string[],
  ): Promise<VaultBalance[]> => {
    if (!vaultContract || !account) {
      return [];
    }

    try {
      const balances = await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          const balanceRaw = await vaultContract.getUserBalance(
            account,
            tokenAddress,
          );
          return {
            tokenAddress,
            balanceRaw,
            balanceFormatted: balanceRaw.toString(),
          };
        }),
      );
      return balances;
    } catch (err) {
      console.error("Failed to get all balances:", err);
      return [];
    }
  };

  // Deposit tokens to vault
  const deposit = async (
    tokenAddress: string,
    amount: string,
  ): Promise<void> => {
    if (!signer || !vaultContract || !account) {
      throw new Error("Wallet not connected");
    }

    if (isPaused) {
      throw new Error("Vault is currently paused");
    }

    try {
      setLoading(true);

      // First, approve vault to spend tokens
      const tokenContract = new Contract(
        tokenAddress,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        signer,
      );

      const amountRaw = parseUnits(amount, 18); // Adjust decimals as needed

      const approveTx = await tokenContract.approve(vaultAddress, amountRaw);
      await approveTx.wait();

      // Then deposit to vault
      const depositTx = await vaultContract.deposit(tokenAddress, amountRaw);
      await depositTx.wait();
    } catch (err) {
      console.error("Deposit failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Withdraw tokens from vault
  const withdraw = async (
    tokenAddress: string,
    amount: string,
  ): Promise<void> => {
    if (!signer || !vaultContract || !account) {
      throw new Error("Wallet not connected");
    }

    if (isPaused) {
      throw new Error("Vault is currently paused");
    }

    try {
      setLoading(true);

      const amountRaw = parseUnits(amount, 18); // Adjust decimals as needed

      const withdrawTx = await vaultContract.withdraw(tokenAddress, amountRaw);
      await withdrawTx.wait();
    } catch (err) {
      console.error("Withdraw failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    vaultContract,
    vaultAddress,
    isPaused,
    getUserBalance,
    getAllBalances,
    deposit,
    withdraw,
    loading,
  };
};
