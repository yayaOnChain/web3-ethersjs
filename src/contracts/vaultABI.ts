export const VAULT_ABI = [
  // View functions
  "function balances(address user, address token) view returns (uint256)",
  "function getUserBalance(address user, address token) view returns (uint256)",
  "function supportedTokens(address) view returns (bool)",
  "function paused() view returns (bool)",

  // User functions
  "function deposit(address token, uint256 amount)",
  "function withdraw(address token, uint256 amount)",

  // Admin functions
  "function addSupportedToken(address token)",
  "function removeSupportedToken(address token)",
  "function emergencyWithdraw(address token, uint256 amount, address payable recipient)",
  "function pause()",
  "function unpause()",

  // Events
  "event Deposit(address indexed user, address indexed token, uint256 amount)",
  "event Withdrawal(address indexed user, address indexed token, uint256 amount)",
  "event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed recipient)",
  "event Paused(address account)",
  "event Unpaused(address account)",
] as const;
