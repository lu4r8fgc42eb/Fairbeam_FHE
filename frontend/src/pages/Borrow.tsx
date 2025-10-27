import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { CreditProfileDialog } from '@/components/CreditProfileDialog';
import { useToast } from '@/hooks/use-toast';
import { useFHELending } from '@/hooks/useFHELending';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, TrendingUp, Shield, Wallet } from 'lucide-react';
import { encryptUint64, decryptUint8, decryptUint64 } from '@/lib/fhe';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { parseEther, formatEther } from 'viem';
import { useAccount, useWalletClient, useWaitForTransactionReceipt } from 'wagmi';

const Borrow = () => {
  const { toast } = useToast();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const {
    collateral,
    debt,
    hasProfile,
    latestRequestId,
    isPending,
    isConfirming,
    requestLoan,
    claimLoan,
    depositCollateral,
    withdrawCollateral,
    repay,
    refetchAll,
    getApprovalHandle,
    getLoanAmountHandle,
  } = useFHELending();

  const [collateralAmount, setCollateralAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txType, setTxType] = useState<string>('');

  // Wait for transaction receipt
  const { isLoading: isWaitingForReceipt, isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Calculate borrowing power (50% of collateral for 200% collateralization)
  const availableToBorrow = parseFloat(collateral) * 0.5 - parseFloat(debt);
  const borrowLimitUsed = parseFloat(collateral) > 0
    ? (parseFloat(debt) / (parseFloat(collateral) * 0.5)) * 100
    : 0;

  useEffect(() => {
    if (address) {
      refetchAll();
    }
  }, [address]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && isProcessing) {
      switch (txType) {
        case 'deposit':
          toast({
            title: 'Collateral Deposited',
            description: `Successfully deposited ${collateralAmount} ETH on-chain`,
          });
          setCollateralAmount('');
          break;
        case 'withdraw':
          toast({
            title: 'Collateral Withdrawn',
            description: `Successfully withdrawn ${collateralAmount} ETH`,
          });
          setCollateralAmount('');
          break;
        case 'repay':
          toast({
            title: 'Loan Repaid',
            description: `Successfully repaid ${repayAmount} ETH`,
          });
          setRepayAmount('');
          break;
      }
      setIsProcessing(false);
      setTxHash(undefined);
      setTxType('');
      refetchAll();
    }
  }, [isTxSuccess, isProcessing]);

  // Handle transaction error
  useEffect(() => {
    if (isTxError && isProcessing) {
      toast({
        title: 'Transaction Failed',
        description: 'The transaction was reverted on-chain',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxHash(undefined);
      setTxType('');
    }
  }, [isTxError, isProcessing]);

  const handleDepositCollateral = async () => {
    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid collateral amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxHash(undefined);
      setTxType('deposit');

      const hash = await depositCollateral(collateralAmount);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: 'Waiting for confirmation...',
      });
    } catch (error: any) {
      toast({
        title: 'Deposit Failed',
        description: error.message || 'Failed to deposit collateral',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  const handleWithdrawCollateral = async () => {
    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxHash(undefined);
      setTxType('withdraw');

      const hash = await withdrawCollateral(collateralAmount);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: 'Waiting for confirmation...',
      });
    } catch (error: any) {
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to withdraw collateral. Check health factor.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  const handleRequestLoan = async () => {
    if (!hasProfile) {
      toast({
        title: 'Credit Profile Required',
        description: 'Please submit your credit profile first',
        variant: 'destructive',
      });
      return;
    }

    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid loan amount',
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(loanAmount) > availableToBorrow) {
      toast({
        title: 'Insufficient Collateral',
        description: `Maximum borrowable: ${availableToBorrow.toFixed(4)} ETH`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      if (!address || !walletClient) {
        throw new Error('Wallet not connected or provider unavailable');
      }

      // Initialize FHE and encrypt loan amount
      const encrypted = await encryptUint64(
        parseEther(loanAmount),
        CONTRACT_ADDRESSES.LoanManager,
        address,
        walletClient
      );

      // Submit loan request
      await requestLoan(encrypted.handle, encrypted.proof);

      toast({
        title: 'Loan Request Submitted',
        description: `Request for ${loanAmount} ETH encrypted and submitted. Check back for approval status.`,
      });

      setLoanAmount('');
      setTimeout(() => refetchAll(), 2000);
    } catch (error: any) {
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to submit loan request',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimLoan = async () => {
    if (!latestRequestId || latestRequestId === 0n) {
      toast({
        title: 'No Loan Request',
        description: 'Please submit a loan request first',
        variant: 'destructive',
      });
      return;
    }

    if (!address || !walletClient) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      toast({
        title: 'Decrypting Approval...',
        description: 'Fetching and decrypting your loan approval status',
      });

      // Step 1: Get encrypted approval handle from contract
      const approvalHandle = await getApprovalHandle(BigInt(latestRequestId));
      if (!approvalHandle) {
        throw new Error('Failed to get approval status from contract');
      }

      // Step 2: Get encrypted loan amount handle from contract
      const amountHandle = await getLoanAmountHandle(BigInt(latestRequestId));
      if (!amountHandle) {
        throw new Error('Failed to get loan amount from contract');
      }

      toast({
        title: 'Decrypting Data...',
        description: 'Decrypting approval status and loan amount',
      });

      // Step 3: Decrypt approval status (euint8: 0 or 1)
      const decryptedApproval = await decryptUint8(
        approvalHandle,
        CONTRACT_ADDRESSES.LoanManager,
        address,
        walletClient
      );

      if (decryptedApproval !== 1) {
        toast({
          title: 'Loan Not Approved',
          description: 'Your loan request was not approved. This may be due to insufficient collateral or high risk score.',
          variant: 'destructive',
        });
        return;
      }

      // Step 4: Decrypt loan amount (euint64)
      const decryptedAmount = await decryptUint64(
        amountHandle,
        CONTRACT_ADDRESSES.LoanManager,
        address,
        walletClient
      );

      toast({
        title: 'Processing Claim...',
        description: `Claiming ${formatEther(decryptedAmount)} ETH`,
      });

      // Step 5: Claim loan with decrypted values
      await claimLoan(BigInt(latestRequestId), decryptedAmount, decryptedApproval);

      toast({
        title: 'Loan Claimed Successfully',
        description: `Successfully claimed ${formatEther(decryptedAmount)} ETH`,
      });

      setTimeout(() => refetchAll(), 2000);
    } catch (error: any) {
      console.error('Claim loan error:', error);
      toast({
        title: 'Claim Failed',
        description: error.message || 'Failed to claim loan. Please check your approval status and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepay = async () => {
    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid repayment amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxHash(undefined);
      setTxType('repay');

      const hash = await repay(repayAmount);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: 'Waiting for confirmation...',
      });
    } catch (error: any) {
      toast({
        title: 'Repayment Failed',
        description: error.message || 'Failed to process repayment',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen pb-12">
        <Navbar />
        <div className="container mx-auto px-4 lg:px-8 pt-32">
          <Card className="p-12 text-center border-gradient card-glow">
            <Wallet className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to access borrowing features
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 pt-32">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-gradient">Borrow Assets</span>
            </h1>
            <p className="text-muted-foreground">
              Request encrypted loans with collateral
            </p>
          </div>
          <CreditProfileDialog />
        </div>

        {/* Borrowing Power Card */}
        <Card className="p-6 border-gradient card-glow mb-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your Collateral</p>
              <p className="text-2xl font-bold text-foreground">{parseFloat(collateral).toFixed(4)} ETH</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Outstanding Debt</p>
              <p className="text-2xl font-bold text-destructive">{parseFloat(debt).toFixed(4)} ETH</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available to Borrow</p>
              <p className="text-2xl font-bold text-primary">{availableToBorrow > 0 ? availableToBorrow.toFixed(4) : '0.0000'} ETH</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Borrow Limit Used</p>
              <p className="text-2xl font-bold text-secondary">{borrowLimitUsed.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        {/* Warning Banner */}
        {!hasProfile && (
          <div className="mb-8 p-4 rounded-lg border border-secondary/30 bg-secondary/5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-secondary mb-1">Credit Profile Required</p>
              <p className="text-sm text-muted-foreground">
                You must submit an encrypted credit profile before requesting loans. Click "Submit Credit Profile" above.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Collateral Management */}
          <Card className="p-6 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Manage Collateral</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="collateral">Amount (ETH)</Label>
                <Input
                  id="collateral"
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  disabled={isProcessing || isWaitingForReceipt}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleDepositCollateral}
                  disabled={isProcessing || isWaitingForReceipt || !collateralAmount}
                  className="flex-1"
                >
                  {isProcessing && txType === 'deposit' && isWaitingForReceipt ? 'Confirming...' : 'Deposit'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWithdrawCollateral}
                  disabled={isProcessing || isWaitingForReceipt || !collateralAmount}
                  className="flex-1"
                >
                  {isProcessing && txType === 'withdraw' && isWaitingForReceipt ? 'Confirming...' : 'Withdraw'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                200% collateralization required. Max borrow = 50% of collateral.
              </p>
            </div>
          </Card>

          {/* Loan Request */}
          <Card className="p-6 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Request Loan</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="loan">Amount (ETH)</Label>
                <Input
                  id="loan"
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  disabled={isProcessing || isPending || isConfirming || !hasProfile}
                />
              </div>

              <Button
                onClick={handleRequestLoan}
                disabled={isProcessing || isPending || isConfirming || !hasProfile || !loanAmount}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                {isProcessing || isPending || isConfirming ? 'Processing...' : 'Request Loan'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Loan requests are encrypted. Approval based on risk score ≤ 600.
              </p>
            </div>
          </Card>

          {/* Repayment */}
          {parseFloat(debt) > 0 && (
            <Card className="p-6 card-glow md:col-span-2">
              <h3 className="text-xl font-bold mb-4">Repay Loan</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="repay">Repayment Amount (ETH)</Label>
                  <Input
                    id="repay"
                    type="number"
                    step="0.001"
                    placeholder="0.00"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    disabled={isProcessing || isWaitingForReceipt}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleRepay}
                    disabled={isProcessing || isWaitingForReceipt || !repayAmount}
                    className="w-full"
                  >
                    {isProcessing && txType === 'repay' && isWaitingForReceipt ? 'Confirming...' : 'Repay'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-6 rounded-xl border border-primary/30 bg-primary/5">
          <h3 className="text-lg font-semibold mb-2 text-primary">🔐 How It Works</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Submit encrypted credit profile (risk score 0-1000, ≤600 for approval)</li>
            <li>Deposit ETH collateral (200% of desired loan)</li>
            <li>Request encrypted loan - approval computed on encrypted data</li>
            <li>Claim approved loans - automatic disbursement</li>
            <li>Repay anytime - reduce debt and free collateral</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Borrow;
