import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useFHELendingWithDecrypt } from '@/hooks/useFHELendingWithDecrypt';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, TrendingUp, Shield, Wallet, Lock, Unlock } from 'lucide-react';
import { useAccount } from 'wagmi';

const BorrowFHE = () => {
  const { toast } = useToast();
  const { address } = useAccount();

  const {
    collateral,
    outstandingDebt,
    maxBorrowable,
    availableLiquidity,
    hasActiveRequest,
    borrowRequest,
    depositCollateral,
    withdrawCollateral,
    requestBorrow,
    claimBorrowedFunds,
    repay,
    decryptBorrowAmount,
    isWriting,
    isConfirming,
    isConfirmed,
    isEncrypting,
    isDecrypting,
    writeError,
  } = useFHELendingWithDecrypt();

  const [collateralAmount, setCollateralAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [decryptedAmount, setDecryptedAmount] = useState<string | null>(null);

  // Calculate borrowing power (50% of collateral for 200% collateralization)
  const availableToBorrow = Math.max(0, parseFloat(maxBorrowable) - parseFloat(outstandingDebt));
  const borrowLimitUsed =
    parseFloat(collateral) > 0 ? (parseFloat(outstandingDebt) / parseFloat(maxBorrowable)) * 100 : 0;

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: 'Transaction Confirmed',
        description: 'Your transaction has been successfully confirmed on-chain.',
      });
    }
  }, [isConfirmed]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: writeError.message || 'An error occurred during the transaction.',
      });
    }
  }, [writeError]);

  const handleDepositCollateral = () => {
    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid collateral amount.',
      });
      return;
    }

    depositCollateral(collateralAmount);
    toast({
      title: 'Depositing Collateral',
      description: `Depositing ${collateralAmount} ETH as collateral...`,
    });
  };

  const handleWithdrawCollateral = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount.',
      });
      return;
    }

    withdrawCollateral(withdrawAmount);
    toast({
      title: 'Withdrawing Collateral',
      description: `Withdrawing ${withdrawAmount} ETH...`,
    });
  };

  const handleRequestBorrow = async () => {
    if (!address) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
      });
      return;
    }

    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid loan amount.',
      });
      return;
    }

    if (parseFloat(loanAmount) > availableToBorrow) {
      toast({
        variant: 'destructive',
        title: 'Exceeds Borrowing Limit',
        description: `You can only borrow up to ${availableToBorrow.toFixed(4)} ETH.`,
      });
      return;
    }

    try {
      await requestBorrow(loanAmount, address);
      toast({
        title: '🔐 Encrypted Borrow Request',
        description: `Request for ${loanAmount} ETH submitted with FHE encryption. Now decrypt to claim funds.`,
      });
      setLoanAmount('');
    } catch (error) {
      console.error('Borrow request failed:', error);
    }
  };

  const handleDecryptAmount = async () => {
    if (!address) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
      });
      return;
    }

    if (!hasActiveRequest) {
      toast({
        variant: 'destructive',
        title: 'No Active Request',
        description: 'You do not have an active borrow request to decrypt.',
      });
      return;
    }

    try {
      toast({
        title: '🔓 Decrypting Amount',
        description: 'Decrypting your encrypted borrow amount...',
      });

      const decrypted = await decryptBorrowAmount(address);
      if (decrypted) {
        setDecryptedAmount(decrypted);
        toast({
          title: 'Decryption Successful',
          description: `Your borrow amount is ${decrypted} ETH. You can now claim these funds.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'No Encrypted Data',
          description: 'Could not find encrypted borrow amount.',
        });
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      toast({
        variant: 'destructive',
        title: 'Decryption Failed',
        description: error instanceof Error ? error.message : 'Failed to decrypt amount.',
      });
    }
  };

  const handleClaimFunds = () => {
    if (!decryptedAmount) {
      toast({
        variant: 'destructive',
        title: 'Decrypt First',
        description: 'Please decrypt your borrow amount before claiming funds.',
      });
      return;
    }

    claimBorrowedFunds(decryptedAmount);
    toast({
      title: 'Claiming Funds',
      description: `Claiming ${decryptedAmount} ETH from liquidity pool...`,
    });
    setDecryptedAmount(null);
  };

  const handleRepay = () => {
    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid repayment amount.',
      });
      return;
    }

    repay(repayAmount);
    toast({
      title: 'Repaying Loan',
      description: `Repaying ${repayAmount} ETH...`,
    });
  };

  const isLoading = isWriting || isConfirming || isEncrypting || isDecrypting;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">FHE Private Lending</h1>
          <p className="text-muted-foreground">
            Borrow funds with fully homomorphic encryption - your loan amounts stay private on-chain
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Collateral</p>
                <p className="text-2xl font-bold">{parseFloat(collateral).toFixed(4)} ETH</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Debt</p>
                <p className="text-2xl font-bold">{parseFloat(outstandingDebt).toFixed(4)} ETH</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available to Borrow</p>
                <p className="text-2xl font-bold">{availableToBorrow.toFixed(4)} ETH</p>
              </div>
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pool Liquidity</p>
                <p className="text-2xl font-bold">{parseFloat(availableLiquidity).toFixed(4)} ETH</p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Borrow Limit Used */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Borrow Limit Used</h3>
            <span className="text-2xl font-bold">{borrowLimitUsed.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                borrowLimitUsed > 80 ? 'bg-red-500' : borrowLimitUsed > 50 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(borrowLimitUsed, 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Collateralization ratio: 200%</p>
        </Card>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Collateral Management */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Manage Collateral
            </h2>

            {/* Deposit */}
            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="collateral-amount">Deposit Amount (ETH)</Label>
                <Input
                  id="collateral-amount"
                  type="number"
                  step="0.001"
                  placeholder="0.0"
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button onClick={handleDepositCollateral} disabled={isLoading} className="w-full">
                {isLoading ? 'Processing...' : 'Deposit Collateral'}
              </Button>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdraw-amount">Withdraw Amount (ETH)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    step="0.001"
                    placeholder="0.0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button onClick={handleWithdrawCollateral} disabled={isLoading} variant="outline" className="w-full">
                  {isLoading ? 'Processing...' : 'Withdraw Collateral'}
                </Button>
              </div>
            </div>
          </Card>

          {/* FHE Borrow Flow */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Lock className="h-6 w-6" />
              Private Borrow (FHE)
            </h2>

            {/* Step 1: Request Borrow */}
            {!hasActiveRequest && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Step 1:</strong> Submit an encrypted borrow request. Your amount will be encrypted on-chain
                    using FHE.
                  </p>
                </div>
                <div>
                  <Label htmlFor="loan-amount">Borrow Amount (ETH)</Label>
                  <Input
                    id="loan-amount"
                    type="number"
                    step="0.001"
                    placeholder="0.0"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Max: {availableToBorrow.toFixed(4)} ETH
                  </p>
                </div>
                <Button onClick={handleRequestBorrow} disabled={isLoading || isEncrypting} className="w-full">
                  {isEncrypting ? (
                    <>
                      <Lock className="mr-2 h-4 w-4 animate-pulse" />
                      Encrypting...
                    </>
                  ) : isLoading ? (
                    'Processing...'
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Request Borrow (Encrypted)
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 2 & 3: Enter amount and Claim */}
            {hasActiveRequest && !borrowRequest?.claimed && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    <strong>Active Request Found!</strong>
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mb-1">
                    Your borrow request is encrypted on-chain. Enter the amount you originally requested to claim funds.
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 italic">
                    Note: FHE decryption via SDK is currently limited. You must remember the amount you requested.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="claim-amount">Borrow Amount to Claim (ETH)</Label>
                    <Input
                      id="claim-amount"
                      type="number"
                      step="0.001"
                      placeholder="Enter the amount you requested (e.g., 0.01)"
                      value={decryptedAmount || ''}
                      onChange={(e) => setDecryptedAmount(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This must match your encrypted borrow request
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!decryptedAmount || parseFloat(decryptedAmount) <= 0) {
                        toast({
                          variant: 'destructive',
                          title: 'Invalid Amount',
                          description: 'Please enter the borrow amount you originally requested.',
                        });
                        return;
                      }
                      handleClaimFunds();
                    }}
                    disabled={isLoading || !decryptedAmount}
                    className="w-full"
                  >
                    {isLoading ? 'Processing...' : decryptedAmount ? `Claim ${decryptedAmount} ETH` : 'Enter Amount to Claim'}
                  </Button>
                </div>
              </div>
            )}

            {/* Already Claimed */}
            {hasActiveRequest && borrowRequest?.claimed && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your borrow request has been claimed. Repay your loan to borrow again.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Repay Loan */}
        {parseFloat(outstandingDebt) > 0 && (
          <Card className="p-6 mt-8">
            <h2 className="text-2xl font-bold mb-6">Repay Loan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="repay-amount">Repay Amount (ETH)</Label>
                <Input
                  id="repay-amount"
                  type="number"
                  step="0.001"
                  placeholder="0.0"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Outstanding: {parseFloat(outstandingDebt).toFixed(4)} ETH
                </p>
              </div>
              <div className="flex items-end">
                <Button onClick={handleRepay} disabled={isLoading} className="w-full">
                  {isLoading ? 'Processing...' : 'Repay Loan'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default BorrowFHE;
