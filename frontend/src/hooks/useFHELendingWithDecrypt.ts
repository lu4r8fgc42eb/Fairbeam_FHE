import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import FHELendingWithDecryptABI from '@/contracts/FHELendingWithDecrypt.json';
import { CONTRACTS } from '@/config/contracts';
import { encryptUint64, decryptUint64 } from '@/lib/fhe';
import { useState, useEffect } from 'react';

export function useFHELendingWithDecrypt() {
  const { address } = useAccount();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { writeContract, data: txHash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // ============ Collateral Functions ============

  const depositCollateral = (amount: string) => {
    writeContract({
      address: CONTRACTS.FHELendingWithDecrypt,
      abi: FHELendingWithDecryptABI,
      functionName: 'depositCollateral',
      value: parseEther(amount),
    });
  };

  const withdrawCollateral = (amount: string) => {
    writeContract({
      address: CONTRACTS.FHELendingWithDecrypt,
      abi: FHELendingWithDecryptABI,
      functionName: 'withdrawCollateral',
      args: [parseEther(amount)],
    });
  };

  // ============ Borrow Functions with FHE Encryption ============

  /**
   * Step 1: Request borrow with encrypted amount
   * @param amountEth Borrow amount in ETH (e.g., "0.01")
   * @param userAddress User's wallet address
   */
  const requestBorrow = async (amountEth: string, userAddress: string) => {
    try {
      setIsEncrypting(true);

      // Convert ETH to wei (bigint)
      const amountWei = parseEther(amountEth);

      // Encrypt the amount using FHE
      const { handle, proof } = await encryptUint64(
        amountWei,
        CONTRACTS.FHELendingWithDecrypt,
        userAddress
      );

      // Submit encrypted borrow request
      writeContract({
        address: CONTRACTS.FHELendingWithDecrypt,
        abi: FHELendingWithDecryptABI,
        functionName: 'requestBorrow',
        args: [handle, proof],
      });
    } catch (error) {
      console.error('Failed to encrypt and request borrow:', error);
      throw error;
    } finally {
      setIsEncrypting(false);
    }
  };

  /**
   * Step 2: Decrypt the borrow amount (off-chain)
   * @param userAddress User's wallet address
   * @returns Decrypted borrow amount in ETH
   */
  const decryptBorrowAmount = async (userAddress: string): Promise<string | null> => {
    try {
      setIsDecrypting(true);

      console.log('borrowRequest raw data:', borrowRequest);

      // Get the encrypted handle from borrowRequest
      // borrowRequest can be either an object {amountEnc, timestamp, claimed} or an array [amountEnc, timestamp, claimed]
      if (!borrowRequest) {
        console.error('No borrow request found - borrowRequest is null/undefined');
        return null;
      }

      // Handle both object and array format
      let handle: `0x${string}`;
      if (Array.isArray(borrowRequest)) {
        handle = borrowRequest[0] as `0x${string}`;
        console.log('borrowRequest is array format, handle:', handle);
      } else if (typeof borrowRequest === 'object') {
        // @ts-ignore
        handle = (borrowRequest.amountEnc || borrowRequest[0]) as `0x${string}`;
        console.log('borrowRequest is object format, handle:', handle);
      } else {
        console.error('borrowRequest has unexpected format:', typeof borrowRequest);
        return null;
      }

      if (!handle) {
        console.error('No encrypted handle found in borrowRequest');
        return null;
      }

      // Check if handle is valid (not zero)
      if (handle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.error('Invalid encrypted handle (zero)');
        return null;
      }

      console.log('Decrypting handle:', handle);

      // Decrypt the amount
      const decryptedWei = await decryptUint64(
        handle,
        CONTRACTS.FHELendingWithDecrypt,
        userAddress
      );

      console.log('Decrypted wei:', decryptedWei);

      // Convert wei to ETH
      return formatEther(decryptedWei);
    } catch (error) {
      console.error('Failed to decrypt borrow amount:', error);
      throw error;
    } finally {
      setIsDecrypting(false);
    }
  };

  /**
   * Step 3: Claim borrowed funds with plaintext amount
   * @param amountEth Plaintext amount in ETH (must match decrypted amount)
   */
  const claimBorrowedFunds = (amountEth: string) => {
    writeContract({
      address: CONTRACTS.FHELendingWithDecrypt,
      abi: FHELendingWithDecryptABI,
      functionName: 'claimBorrowedFunds',
      args: [parseEther(amountEth)],
    });
  };

  // ============ Repay Function ============

  const repay = (amount: string) => {
    writeContract({
      address: CONTRACTS.FHELendingWithDecrypt,
      abi: FHELendingWithDecryptABI,
      functionName: 'repay',
      value: parseEther(amount),
    });
  };

  // ============ Read Functions ============

  const { data: collateral, refetch: refetchCollateral } = useReadContract({
    address: CONTRACTS.FHELendingWithDecrypt,
    abi: FHELendingWithDecryptABI,
    functionName: 'getCollateral',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 3000, // Auto-refetch every 3 seconds
    },
  });

  const { data: outstandingDebt, refetch: refetchDebt } = useReadContract({
    address: CONTRACTS.FHELendingWithDecrypt,
    abi: FHELendingWithDecryptABI,
    functionName: 'getOutstandingDebt',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 3000,
    },
  });

  const { data: maxBorrowable, refetch: refetchMaxBorrowable } = useReadContract({
    address: CONTRACTS.FHELendingWithDecrypt,
    abi: FHELendingWithDecryptABI,
    functionName: 'getMaxBorrowable',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 3000,
    },
  });

  const { data: availableLiquidity, refetch: refetchLiquidity } = useReadContract({
    address: CONTRACTS.FHELendingWithDecrypt,
    abi: FHELendingWithDecryptABI,
    functionName: 'getAvailableLiquidity',
    query: {
      refetchInterval: 3000,
    },
  });

  const { data: hasActiveRequest, refetch: refetchActiveRequest } = useReadContract({
    address: CONTRACTS.FHELendingWithDecrypt,
    abi: FHELendingWithDecryptABI,
    functionName: 'hasActiveRequest',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 3000,
    },
  });

  const { data: borrowRequest, refetch: refetchBorrowRequest } = useReadContract({
    address: CONTRACTS.FHELendingWithDecrypt,
    abi: FHELendingWithDecryptABI,
    functionName: 'borrowRequests',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 3000,
    },
  });

  // Manual refetch all data
  const refetchAll = () => {
    refetchCollateral();
    refetchDebt();
    refetchMaxBorrowable();
    refetchLiquidity();
    refetchActiveRequest();
    refetchBorrowRequest();
  };

  // Auto-refetch when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      // Wait a bit for blockchain to update
      setTimeout(() => {
        refetchAll();
      }, 1000);
    }
  }, [isConfirmed]);

  return {
    // Write functions
    depositCollateral,
    withdrawCollateral,
    requestBorrow,
    claimBorrowedFunds,
    repay,

    // Decrypt function
    decryptBorrowAmount,

    // Refetch function
    refetchAll,

    // Transaction states
    txHash,
    isWriting,
    isConfirming,
    isConfirmed,
    writeError,

    // Encryption/Decryption states
    isEncrypting,
    isDecrypting,

    // Read values
    collateral: collateral ? formatEther(collateral as bigint) : '0',
    outstandingDebt: outstandingDebt ? formatEther(outstandingDebt as bigint) : '0',
    maxBorrowable: maxBorrowable ? formatEther(maxBorrowable as bigint) : '0',
    availableLiquidity: availableLiquidity ? formatEther(availableLiquidity as bigint) : '0',
    hasActiveRequest: hasActiveRequest as boolean,
    borrowRequest: borrowRequest as { amountEnc: string; timestamp: bigint; claimed: boolean } | undefined,
  };
}
