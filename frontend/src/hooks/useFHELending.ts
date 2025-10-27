import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { readContract } from '@wagmi/core';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import FHELendingV2ABI from '@/contracts/FHELendingV2.json';
import { formatEther, parseEther } from 'viem';
import { config } from '@/config/wagmi';

/**
 * Hook for FHELendingV2 main contract interactions
 */
export function useFHELending() {
  const { address } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();

  // Read user's collateral
  const { data: collateral, refetch: refetchCollateral } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELendingV2,
    abi: FHELendingV2ABI.abi,
    functionName: 'getCollateral',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read user's outstanding debt
  const { data: debt, refetch: refetchDebt } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELendingV2,
    abi: FHELendingV2ABI.abi,
    functionName: 'getOutstandingDebt',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read pool liquidity
  const { data: poolLiquidity, refetch: refetchLiquidity } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELendingV2,
    abi: FHELendingV2ABI.abi,
    functionName: 'getPoolLiquidity',
  });

  // Read latest request ID
  const { data: latestRequestId } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELendingV2,
    abi: FHELendingV2ABI.abi,
    functionName: 'getLatestRequestId',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Check if user has profile
  const { data: hasProfile } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELendingV2,
    abi: FHELendingV2ABI.abi,
    functionName: 'hasProfile',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Deposit collateral
   */
  const depositCollateral = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELendingV2,
      abi: FHELendingV2ABI.abi,
      functionName: 'depositCollateral',
      value: parseEther(amount),
      gas: 300000n,
    });
  };

  /**
   * Withdraw collateral
   */
  const withdrawCollateral = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELendingV2,
      abi: FHELendingV2ABI.abi,
      functionName: 'withdrawCollateral',
      args: [parseEther(amount)],
      gas: 300000n,
    });
  };

  /**
   * Submit encrypted credit profile (call CreditScoring directly)
   */
  const submitProfile = async (riskHandle: `0x${string}`, proof: `0x${string}`) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.CreditScoring,
      abi: FHELendingV2ABI.abi,
      functionName: 'submitProfile',
      args: [riskHandle, proof],
      gas: 500000n,
    });
  };

  /**
   * Update existing credit profile (call CreditScoring directly)
   */
  const updateProfile = async (riskHandle: `0x${string}`, proof: `0x${string}`) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.CreditScoring,
      abi: FHELendingV2ABI.abi,
      functionName: 'updateProfile',
      args: [riskHandle, proof],
      gas: 500000n,
    });
  };

  /**
   * Request encrypted loan
   */
  const requestLoan = async (amountHandle: `0x${string}`, proof: `0x${string}`) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELendingV2,
      abi: FHELendingV2ABI.abi,
      functionName: 'requestLoan',
      args: [amountHandle, proof],
      gas: 500000n,
    });
  };

  /**
   * Claim approved loan
   */
  const claimLoan = async (requestId: bigint, amountPlain: bigint, decryptedApproval: number) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELendingV2,
      abi: FHELendingV2ABI.abi,
      functionName: 'claimLoan',
      args: [requestId, amountPlain, decryptedApproval],
      gas: 400000n,
    });
  };

  /**
   * Repay loan
   */
  const repay = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELendingV2,
      abi: FHELendingV2ABI.abi,
      functionName: 'repay',
      value: parseEther(amount),
      gas: 300000n,
    });
  };

  /**
   * Add liquidity to pool
   */
  const addLiquidity = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELendingV2,
      abi: FHELendingV2ABI.abi,
      functionName: 'addLiquidity',
      value: parseEther(amount),
      gas: 200000n,
    });
  };

  /**
   * Remove liquidity from pool
   */
  const removeLiquidity = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELendingV2,
      abi: FHELendingV2ABI.abi,
      functionName: 'removeLiquidity',
      args: [parseEther(amount)],
      gas: 250000n,
    });
  };

  /**
   * Get encrypted loan approval status (euint8 handle)
   */
  const getApprovalHandle = async (requestId: bigint): Promise<`0x${string}` | null> => {
    if (!address) return null;

    try {
      const result = await readContract(config, {
        address: CONTRACT_ADDRESSES.LoanManager,
        abi: FHELendingV2ABI.abi, // Should use LoanManagerABI
        functionName: 'getApprovalStatus',
        args: [address, requestId],
      });
      return result as `0x${string}`;
    } catch (error) {
      console.error('Failed to get approval handle:', error);
      return null;
    }
  };

  /**
   * Get encrypted loan amount (euint64 handle)
   */
  const getLoanAmountHandle = async (requestId: bigint): Promise<`0x${string}` | null> => {
    if (!address) return null;

    try {
      const result = await readContract(config, {
        address: CONTRACT_ADDRESSES.LoanManager,
        abi: FHELendingV2ABI.abi, // Should use LoanManagerABI
        functionName: 'getLoanAmount',
        args: [address, requestId],
      });
      return result as `0x${string}`;
    } catch (error) {
      console.error('Failed to get loan amount handle:', error);
      return null;
    }
  };

  /**
   * Refresh all data
   */
  const refetchAll = () => {
    refetchCollateral();
    refetchDebt();
    refetchLiquidity();
  };

  return {
    // Data
    collateral: collateral ? formatEther(collateral as bigint) : '0',
    debt: debt ? formatEther(debt as bigint) : '0',
    poolLiquidity: poolLiquidity ? formatEther(poolLiquidity as bigint) : '0',
    latestRequestId: latestRequestId ? (latestRequestId as bigint) : 0n,
    hasProfile: hasProfile as boolean,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,

    // Actions
    depositCollateral,
    withdrawCollateral,
    submitProfile,
    updateProfile,
    requestLoan,
    claimLoan,
    repay,
    addLiquidity,
    removeLiquidity,
    refetchAll,

    // FHE Data Access
    getApprovalHandle,
    getLoanAmountHandle,
  };
}
