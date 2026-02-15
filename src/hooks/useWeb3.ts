import { useState, useEffect } from "react";
import { BrowserProvider, JsonRpcSigner, Network } from "ethers";

interface NetworkInfo {
  chainId: number;
  name: string;
  nativeCurrency: string;
  explorerUrl: string;
  isSupported: boolean;
}

export const SUPPORTED_NETWORKS: Record<number, NetworkInfo> = {
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    nativeCurrency: "ETH",
    explorerUrl: "https://etherscan.io",
    isSupported: true,
  },
  11155111: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    nativeCurrency: "ETH",
    explorerUrl: "https://sepolia.etherscan.io",
    isSupported: true,
  },
  5: {
    chainId: 5,
    name: "Goerli Testnet",
    nativeCurrency: "ETH",
    explorerUrl: "https://goerli.etherscan.io",
    isSupported: false, // Deprecated
  },
  8453: {
    chainId: 8453,
    name: "Base Mainnet",
    nativeCurrency: "ETH",
    explorerUrl: "https://basescan.org",
    isSupported: false,
  },
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    nativeCurrency: "ETH",
    explorerUrl: "https://base-sepolia.blockscout.com",
    isSupported: false,
  },
};

interface Web3Context {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  network: NetworkInfo | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

export const useWeb3 = (): Web3Context => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereumProvider = new BrowserProvider((window as any).ethereum);
      setProvider(ethereumProvider);

      // Get initial account and chainId
      ethereumProvider.getSigner().then((s) => {
        s.getAddress()
          .then(setAccount)
          .catch(() => {});
      });
      ethereumProvider.getNetwork().then(updateNetworkInfo);
    }
  }, []);

  const updateNetworkInfo = async (networkData: Network) => {
    const chainIdNum = Number(networkData.chainId);
    setChainId(chainIdNum);

    const networkInfo = SUPPORTED_NETWORKS[chainIdNum] || {
      chainId: chainIdNum,
      name: `Chain ${chainIdNum}`,
      nativeCurrency: "ETH",
      explorerUrl: "#",
      isSupported: false,
    };

    setNetwork(networkInfo);
  };

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log("🔄 Accounts changed:", accounts);
      setAccount(accounts[0] || null);
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = Number(chainIdHex);
      console.log("🔄 Chain changed:", {
        oldChainId: chainId,
        newChainId,
        hex: chainIdHex,
      });
      setChainId(newChainId);

      // Update network info
      const networkInfo = SUPPORTED_NETWORKS[newChainId] || {
        chainId: newChainId,
        name: `Chain ${newChainId}`,
        nativeCurrency: "ETH",
        explorerUrl: "#",
        isSupported: false,
      };
      setNetwork(networkInfo);
    };

    if ((window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.on("chainChanged", handleChainChanged);

      // Initial check
      console.log("🔌 Web3 initialized:", {
        hasEthereum: !!(window as any).ethereum,
        initialAccount: account,
        initialChainId: chainId,
      });
    }

    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        (window as any).ethereum.removeListener(
          "chainChanged",
          handleChainChanged,
        );
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!provider) throw new Error("MetaMask not detected");

    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      const networkData = await provider.getNetwork();
      const signer = await provider.getSigner();

      setSigner(signer);
      setAccount(accounts[0]);
      updateNetworkInfo(networkData);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setNetwork(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!provider) throw new Error("Wallet not connected");

    try {
      const hexChainId = `0x${targetChainId.toString(16)}`;

      await provider.send("wallet_switchEthereumChain", [
        { chainId: hexChainId },
      ]);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        const networkInfo = SUPPORTED_NETWORKS[targetChainId];
        if (!networkInfo) {
          throw new Error(`Network ${targetChainId} is not configured`);
        }

        // Add the network to MetaMask
        await provider.send("wallet_addEthereumChain", [
          {
            chainId: chainId,
            chainName: networkInfo.name,
            nativeCurrency: {
              name: networkInfo.nativeCurrency,
              symbol: networkInfo.nativeCurrency,
              decimals: 18,
            },
            rpcUrls: getRpcUrls(targetChainId),
            blockExplorerUrls: [networkInfo.explorerUrl],
          },
        ]);
      } else {
        throw switchError;
      }
    }
  };

  const getRpcUrls = (chainId: number): string[] => {
    const rpcMap: Record<number, string[]> = {
      1: ["https://mainnet.infura.io/v3/YOUR_INFURA_KEY"],
      11155111: ["https://sepolia.infura.io/v3/YOUR_INFURA_KEY"],
      5: ["https://goerli.infura.io/v3/YOUR_INFURA_KEY"],
      8453: ["https://mainnet.base.org"],
      84532: ["https://sepolia.base.org"],
    };
    return rpcMap[chainId] || ["https://ethereum.publicnode.com"];
  };

  return {
    provider,
    signer,
    account,
    chainId,
    network,
    isConnected: !!account,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };
};
