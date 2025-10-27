// Contract addresses from environment variables
export const CONTRACT_ADDRESSES = {
  FHELendingV2: import.meta.env.VITE_FHELENDING_V2_ADDRESS as `0x${string}`,
  CollateralManager: import.meta.env.VITE_COLLATERAL_MANAGER_ADDRESS as `0x${string}`,
  CreditScoring: import.meta.env.VITE_CREDIT_SCORING_ADDRESS as `0x${string}`,
  LoanManager: import.meta.env.VITE_LOAN_MANAGER_ADDRESS as `0x${string}`,
  LiquidityPool: import.meta.env.VITE_LIQUIDITY_POOL_ADDRESS as `0x${string}`,
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID) || 11155111,
  chainName: import.meta.env.VITE_CHAIN_NAME || 'Sepolia',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'https://gateway.sepolia.zama.ai',
} as const;

// WalletConnect Project ID
export const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Contract risk parameters
export const LENDING_PARAMS = {
  MAX_RISK_SCORE: 600,
  COLLATERAL_RATIO: 200, // 200% collateralization
  MIN_COLLATERAL: BigInt(1000000000000000), // 0.001 ETH minimum
} as const;
