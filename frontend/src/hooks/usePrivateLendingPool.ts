import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import PrivateLendingPoolABI from '@/contracts/PrivateLendingPool.json';
import { encryptUint64, decryptUint64 } from '@/lib/fhe';
import { parseEther } from 'viem';

/**
 * Hook for Private Lending Pool interactions
 * All operations use encrypted cETH for true amount privacy
 */
export function usePrivateLendingPool() {
  const { address } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();

  // Check if user has collateral
  const { data: hasCollateral, refetch: refetchHasCollateral } = useReadContract({
    address: CONTRACTS.PrivateLendingPool,
    abi: PrivateLendingPoolABI,
    functionName: 'hasCollateral',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Check if user has debt
  const { data: hasDebt, refetch: refetchHasDebt } = useReadContract({
    address: CONTRACTS.PrivateLendingPool,
    abi: PrivateLendingPoolABI,
    functionName: 'hasDebt',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Check if user has supplied
  const { data: hasSupplied, refetch: refetchHasSupplied } = useReadContract({
    address: CONTRACTS.PrivateLendingPool,
    abi: PrivateLendingPoolABI,
    functionName: 'hasSupplied',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get collateral ratio
  const { data: collateralRatio } = useReadContract({
    address: CONTRACTS.PrivateLendingPool,
    abi: PrivateLendingPoolABI,
    functionName: 'COLLATERAL_RATIO',
  });

  // Get encrypted collateral handle
  const { data: encCollateralHandle, refetch: refetchCollateral } = useReadContract({
    address: CONTRACTS.PrivateLendingPool,
    abi: PrivateLendingPoolABI,
    functionName: 'getCollateralEncrypted',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get encrypted debt handle
  const { data: encDebtHandle, refetch: refetchDebt } = useReadContract({
    address: CONTRACTS.PrivateLendingPool,
    abi: PrivateLendingPoolABI,
    functionName: 'getDebtEncrypted',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get encrypted supply handle
  const { data: encSuppliedHandle, refetch: refetchSupplied } = useReadContract({
    address: CONTRACTS.PrivateLendingPool,
    abi: PrivateLendingPoolABI,
    functionName: 'getSuppliedEncrypted',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Deposit encrypted collateral
   * @param amount Amount in ETH (will be converted to wei and encrypted)
   */
  const depositCollateral = async (amount: string, provider?: any) => {
    if (!address) throw new Error('Wallet not connected');

    const weiAmount = parseEther(amount);

    // Encrypt the amount for the lending pool
    const encrypted = await encryptUint64(
      weiAmount,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );

    return await writeContractAsync({
      address: CONTRACTS.PrivateLendingPool,
      abi: PrivateLendingPoolABI,
      functionName: 'depositCollateral',
      args: [encrypted.handle, encrypted.proof],
      gas: 800000n,
    });
  };

  /**
   * Withdraw encrypted collateral
   */
  const withdrawCollateral = async (amount: string, provider?: any) => {
    if (!address) throw new Error('Wallet not connected');

    const weiAmount = parseEther(amount);

    const encrypted = await encryptUint64(
      weiAmount,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );

    return await writeContractAsync({
      address: CONTRACTS.PrivateLendingPool,
      abi: PrivateLendingPoolABI,
      functionName: 'withdrawCollateral',
      args: [encrypted.handle, encrypted.proof],
      gas: 800000n,
    });
  };

  /**
   * Borrow encrypted amount
   */
  const borrow = async (amount: string, provider?: any) => {
    if (!address) throw new Error('Wallet not connected');

    const weiAmount = parseEther(amount);

    const encrypted = await encryptUint64(
      weiAmount,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );

    return await writeContractAsync({
      address: CONTRACTS.PrivateLendingPool,
      abi: PrivateLendingPoolABI,
      functionName: 'borrow',
      args: [encrypted.handle, encrypted.proof],
      gas: 800000n,
    });
  };

  /**
   * Repay encrypted amount
   */
  const repay = async (amount: string, provider?: any) => {
    if (!address) throw new Error('Wallet not connected');

    const weiAmount = parseEther(amount);

    const encrypted = await encryptUint64(
      weiAmount,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );

    return await writeContractAsync({
      address: CONTRACTS.PrivateLendingPool,
      abi: PrivateLendingPoolABI,
      functionName: 'repay',
      args: [encrypted.handle, encrypted.proof],
      gas: 800000n,
    });
  };

  /**
   * Supply encrypted amount to pool (lender)
   */
  const supply = async (amount: string, provider?: any) => {
    if (!address) throw new Error('Wallet not connected');

    const weiAmount = parseEther(amount);

    const encrypted = await encryptUint64(
      weiAmount,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );

    return await writeContractAsync({
      address: CONTRACTS.PrivateLendingPool,
      abi: PrivateLendingPoolABI,
      functionName: 'supply',
      args: [encrypted.handle, encrypted.proof],
      gas: 800000n,
    });
  };

  /**
   * Withdraw supply from pool (lender)
   */
  const withdrawSupply = async (amount: string, provider?: any) => {
    if (!address) throw new Error('Wallet not connected');

    const weiAmount = parseEther(amount);

    const encrypted = await encryptUint64(
      weiAmount,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );

    return await writeContractAsync({
      address: CONTRACTS.PrivateLendingPool,
      abi: PrivateLendingPoolABI,
      functionName: 'withdrawSupply',
      args: [encrypted.handle, encrypted.proof],
      gas: 800000n,
    });
  };

  /**
   * Decrypt user's collateral amount
   */
  const decryptCollateral = async (provider?: any): Promise<bigint> => {
    if (!address) throw new Error('Wallet not connected');
    if (!encCollateralHandle) throw new Error('No collateral to decrypt');

    return await decryptUint64(
      encCollateralHandle as `0x${string}`,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );
  };

  /**
   * Decrypt user's debt amount
   */
  const decryptDebt = async (provider?: any): Promise<bigint> => {
    if (!address) throw new Error('Wallet not connected');
    if (!encDebtHandle) throw new Error('No debt to decrypt');

    return await decryptUint64(
      encDebtHandle as `0x${string}`,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );
  };

  /**
   * Decrypt user's supplied amount
   */
  const decryptSupplied = async (provider?: any): Promise<bigint> => {
    if (!address) throw new Error('Wallet not connected');
    if (!encSuppliedHandle) throw new Error('No supply to decrypt');

    return await decryptUint64(
      encSuppliedHandle as `0x${string}`,
      CONTRACTS.PrivateLendingPool,
      address,
      provider
    );
  };

  /**
   * Refresh all data
   */
  const refetchAll = () => {
    refetchHasCollateral();
    refetchHasDebt();
    refetchHasSupplied();
    refetchCollateral();
    refetchDebt();
    refetchSupplied();
  };

  return {
    // Data
    hasCollateral: hasCollateral as boolean,
    hasDebt: hasDebt as boolean,
    hasSupplied: hasSupplied as boolean,
    collateralRatio: collateralRatio ? Number(collateralRatio) : 200,
    encCollateralHandle: encCollateralHandle as `0x${string}` | undefined,
    encDebtHandle: encDebtHandle as `0x${string}` | undefined,
    encSuppliedHandle: encSuppliedHandle as `0x${string}` | undefined,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,

    // Actions
    depositCollateral,
    withdrawCollateral,
    borrow,
    repay,
    supply,
    withdrawSupply,
    decryptCollateral,
    decryptDebt,
    decryptSupplied,
    refetchAll,
  };
}
