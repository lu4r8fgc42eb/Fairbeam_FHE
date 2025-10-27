import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import FHELendingSimpleABI from '@/contracts/FHELendingSimple.json';
import { parseEther } from 'viem';

/**
 * Hook for FHELendingSimple contract interactions
 * Simplified version - no FHE, no approval, direct borrowing
 */
export function useFHELendingSimple() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  // Read user's collateral
  const { data: collateral, refetch: refetchCollateral } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELending,
    abi: FHELendingSimpleABI.abi,
    functionName: 'getCollateral',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read user's outstanding debt
  const { data: debt, refetch: refetchDebt } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELending,
    abi: FHELendingSimpleABI.abi,
    functionName: 'getOutstandingDebt',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read max borrowable amount
  const { data: maxBorrowable, refetch: refetchMaxBorrowable } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELending,
    abi: FHELendingSimpleABI.abi,
    functionName: 'getMaxBorrowable',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read pool liquidity
  const { data: poolLiquidity, refetch: refetchLiquidity } = useReadContract({
    address: CONTRACT_ADDRESSES.FHELending,
    abi: FHELendingSimpleABI.abi,
    functionName: 'getAvailableLiquidity',
  });

  /**
   * Deposit collateral
   */
  const depositCollateral = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELending,
      abi: FHELendingSimpleABI.abi,
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
      address: CONTRACT_ADDRESSES.FHELending,
      abi: FHELendingSimpleABI.abi,
      functionName: 'withdrawCollateral',
      args: [parseEther(amount)],
      gas: 300000n,
    });
  };

  /**
   * Borrow against collateral
   */
  const borrow = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELending,
      abi: FHELendingSimpleABI.abi,
      functionName: 'borrow',
      args: [parseEther(amount)],
      gas: 500000n,
    });
  };

  /**
   * Repay loan
   */
  const repay = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES.FHELending,
      abi: FHELendingSimpleABI.abi,
      functionName: 'repay',
      value: parseEther(amount),
      gas: 300000n,
    });
  };

  /**
   * Refetch all data
   */
  const refetchAll = () => {
    refetchCollateral();
    refetchDebt();
    refetchMaxBorrowable();
    refetchLiquidity();
  };

  return {
    // Data
    collateral: collateral ? collateral.toString() : '0',
    debt: debt ? debt.toString() : '0',
    maxBorrowable: maxBorrowable ? maxBorrowable.toString() : '0',
    poolLiquidity: poolLiquidity ? poolLiquidity.toString() : '0',
    isPending,

    // Actions
    depositCollateral,
    withdrawCollateral,
    borrow,
    repay,
    refetchAll,
  };
}
