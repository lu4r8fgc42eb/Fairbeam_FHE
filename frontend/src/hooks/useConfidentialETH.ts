import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import ConfidentialETHABI from '@/contracts/ConfidentialETH.json';
import { formatEther, parseEther } from 'viem';
import { encryptUint64, decryptUint64 } from '@/lib/fhe';

/**
 * Hook for Confidential ETH (cETH) interactions
 * Enables wrapping ETH to encrypted cETH and vice versa
 */
export function useConfidentialETH() {
  const { address } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();

  // Get ETH balance
  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address: address,
  });

  // Get cETH total supply (plaintext)
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: CONTRACTS.ConfidentialETH,
    abi: ConfidentialETHABI,
    functionName: 'totalSupply',
  });

  // Check if user has balance (to know if decryption is possible)
  const { data: hasBalance, refetch: refetchHasBalance } = useReadContract({
    address: CONTRACTS.ConfidentialETH,
    abi: ConfidentialETHABI,
    functionName: 'hasBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Check if lending pool is approved
  const { data: isPoolApproved, refetch: refetchPoolApproval } = useReadContract({
    address: CONTRACTS.ConfidentialETH,
    abi: ConfidentialETHABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, CONTRACTS.PrivateLendingPool] : undefined,
    query: { enabled: !!address },
  });

  // Get encrypted balance handle (for decryption)
  const { data: encBalanceHandle, refetch: refetchEncBalance } = useReadContract({
    address: CONTRACTS.ConfidentialETH,
    abi: ConfidentialETHABI,
    functionName: 'balanceOfEncrypted',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Wrap ETH to cETH
   * Note: Initial wrap amount is visible, but subsequent transfers are encrypted
   */
  const wrap = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    const weiAmount = parseEther(amount);

    // Max uint64 in wei is about 18.4 ETH
    if (weiAmount > BigInt('18446744073709551615')) {
      throw new Error('Amount exceeds maximum (18.4 ETH per wrap)');
    }

    return await writeContractAsync({
      address: CONTRACTS.ConfidentialETH,
      abi: ConfidentialETHABI,
      functionName: 'wrap',
      value: weiAmount,
      gas: 300000n,
    });
  };

  /**
   * Unwrap cETH back to ETH
   * Note: User reveals amount when unwrapping
   */
  const unwrap = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACTS.ConfidentialETH,
      abi: ConfidentialETHABI,
      functionName: 'unwrap',
      args: [parseEther(amount)],
      gas: 300000n,
    });
  };

  /**
   * Approve lending pool to transfer cETH on behalf of user
   */
  const approveLendingPool = async () => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACTS.ConfidentialETH,
      abi: ConfidentialETHABI,
      functionName: 'setApprovalForAll',
      args: [CONTRACTS.PrivateLendingPool, true],
      gas: 100000n,
    });
  };

  /**
   * Revoke lending pool approval
   */
  const revokeLendingPool = async () => {
    if (!address) throw new Error('Wallet not connected');

    return await writeContractAsync({
      address: CONTRACTS.ConfidentialETH,
      abi: ConfidentialETHABI,
      functionName: 'setApprovalForAll',
      args: [CONTRACTS.PrivateLendingPool, false],
      gas: 100000n,
    });
  };

  /**
   * Transfer encrypted cETH to another address
   */
  const transferEncrypted = async (
    to: string,
    amount: bigint,
    provider?: any
  ) => {
    if (!address) throw new Error('Wallet not connected');

    // Encrypt the amount
    const encrypted = await encryptUint64(
      amount,
      CONTRACTS.ConfidentialETH,
      address,
      provider
    );

    return await writeContractAsync({
      address: CONTRACTS.ConfidentialETH,
      abi: ConfidentialETHABI,
      functionName: 'transferEncrypted',
      args: [to, encrypted.handle, encrypted.proof],
      gas: 500000n,
    });
  };

  /**
   * Decrypt user's cETH balance
   */
  const decryptBalance = async (provider?: any): Promise<bigint> => {
    if (!address) throw new Error('Wallet not connected');
    if (!encBalanceHandle) throw new Error('No balance to decrypt');

    return await decryptUint64(
      encBalanceHandle as `0x${string}`,
      CONTRACTS.ConfidentialETH,
      address,
      provider
    );
  };

  /**
   * Refresh all data
   */
  const refetchAll = () => {
    refetchEthBalance();
    refetchTotalSupply();
    refetchHasBalance();
    refetchPoolApproval();
    refetchEncBalance();
  };

  return {
    // Data
    ethBalance: ethBalance ? formatEther(ethBalance.value) : '0',
    totalSupply: totalSupply ? formatEther(totalSupply as bigint) : '0',
    hasBalance: hasBalance as boolean,
    isPoolApproved: isPoolApproved as boolean,
    encBalanceHandle: encBalanceHandle as `0x${string}` | undefined,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,

    // Actions
    wrap,
    unwrap,
    approveLendingPool,
    revokeLendingPool,
    transferEncrypted,
    decryptBalance,
    refetchAll,
  };
}
