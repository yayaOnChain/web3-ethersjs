import { formatUnits } from "ethers";

export const formatTokenAmount = (
  amount: bigint | string,
  decimals: number,
): string => {
  try {
    const amountBigInt = typeof amount === "string" ? BigInt(amount) : amount;
    return parseFloat(formatUnits(amountBigInt, decimals)).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals < 6 ? decimals : 6,
      },
    );
  } catch (error) {
    console.error("Format error:", error);
    return "0";
  }
};

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

export const getTokenIcon = (symbol: string): string => {
  const icons: Record<string, string> = {
    USDT: "/icons/usdt.png",
    USDC: "/icons/usdc.png",
    DAI: "/icons/dai.png",
    // Add more icons as needed
  };
  return icons[symbol] || "/icons/default-token.png";
};
