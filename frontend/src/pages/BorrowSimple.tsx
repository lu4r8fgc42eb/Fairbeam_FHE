import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useFHELendingSimple } from '@/hooks/useFHELendingSimple';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Wallet, ArrowDownUp } from 'lucide-react';
import { parseEther, formatEther } from 'viem';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';

const BorrowSimple = () => {
  const { toast } = useToast();
  const { address } = useAccount();

  const {
    collateral,
    debt,
    maxBorrowable,
    poolLiquidity,
    isPending,
    depositCollateral,
    withdrawCollateral,
    borrow,
    repay,
    refetchAll,
  } = useFHELendingSimple();

  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txType, setTxType] = useState<string>('');

  // Wait for transaction receipt
  const { isLoading: isWaitingForReceipt, isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Calculate borrowing power (50% of collateral)
  const availableToBorrow = parseFloat(formatEther(BigInt(maxBorrowable || '0')));
  const borrowLimitUsed = parseFloat(collateral) > 0
    ? (parseFloat(formatEther(BigInt(debt || '0'))) / (parseFloat(formatEther(BigInt(collateral || '0'))) * 0.5)) * 100
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
            description: `Successfully deposited ${collateralAmount} ETH`,
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
        case 'borrow':
          toast({
            title: 'Loan Borrowed',
            description: `Successfully borrowed ${borrowAmount} ETH`,
          });
          setBorrowAmount('');
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
        description: error.message,
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
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid borrow amount',
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(borrowAmount) > availableToBorrow) {
      toast({
        title: 'Insufficient Collateral',
        description: `Maximum borrowable: ${availableToBorrow.toFixed(4)} ETH`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxHash(undefined);
      setTxType('borrow');

      const hash = await borrow(borrowAmount);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: 'Waiting for confirmation...',
      });
    } catch (error: any) {
      toast({
        title: 'Borrow Failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
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
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Borrow</h1>
          <p className="text-muted-foreground">
            Deposit collateral and borrow instantly. 50% LTV (200% collateralization).
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Your Collateral</span>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{parseFloat(formatEther(BigInt(collateral || '0'))).toFixed(4)} ETH</div>
          </Card>

          <Card className="p-6 border-secondary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Your Debt</span>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-2xl font-bold">{parseFloat(formatEther(BigInt(debt || '0'))).toFixed(4)} ETH</div>
          </Card>

          <Card className="p-6 border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Available to Borrow</span>
              <ArrowDownUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">{availableToBorrow.toFixed(4)} ETH</div>
          </Card>
        </div>

        {/* Borrow Limit Progress */}
        <Card className="p-6 mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Borrow Limit Used</span>
            <span className="text-sm font-bold">{borrowLimitUsed.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-secondary/20 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                borrowLimitUsed > 80 ? 'bg-destructive' : borrowLimitUsed > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(borrowLimitUsed, 100)}%` }}
            />
          </div>
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collateral Management */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Manage Collateral</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="collateral">Amount (ETH)</Label>
                <Input
                  id="collateral"
                  type="number"
                  step="0.01"
                  placeholder="0.0"
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
                  {isProcessing && txType === 'deposit' ? 'Processing...' : 'Deposit'}
                </Button>
                <Button
                  onClick={handleWithdrawCollateral}
                  disabled={isProcessing || isWaitingForReceipt || !collateralAmount}
                  variant="outline"
                  className="flex-1"
                >
                  {isProcessing && txType === 'withdraw' ? 'Processing...' : 'Withdraw'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Borrow/Repay */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Borrow & Repay</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="borrow">Borrow Amount (ETH)</Label>
                <Input
                  id="borrow"
                  type="number"
                  step="0.01"
                  placeholder="0.0"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  disabled={isProcessing || isWaitingForReceipt}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {availableToBorrow.toFixed(4)} ETH
                </p>
              </div>
              <Button
                onClick={handleBorrow}
                disabled={isProcessing || isWaitingForReceipt || !borrowAmount || availableToBorrow <= 0}
                className="w-full"
              >
                {isProcessing && txType === 'borrow' ? 'Processing...' : 'Borrow'}
              </Button>

              <div>
                <Label htmlFor="repay">Repay Amount (ETH)</Label>
                <Input
                  id="repay"
                  type="number"
                  step="0.01"
                  placeholder="0.0"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  disabled={isProcessing || isWaitingForReceipt}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Debt: {parseFloat(formatEther(BigInt(debt || '0'))).toFixed(4)} ETH
                </p>
              </div>
              <Button
                onClick={handleRepay}
                disabled={isProcessing || isWaitingForReceipt || !repayAmount || parseFloat(debt) <= 0}
                variant="secondary"
                className="w-full"
              >
                {isProcessing && txType === 'repay' ? 'Processing...' : 'Repay'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Pool Info */}
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold mb-2">Pool Information</h3>
          <p className="text-sm text-muted-foreground">
            Available Liquidity: {parseFloat(formatEther(BigInt(poolLiquidity || '0'))).toFixed(4)} ETH
          </p>
        </Card>
      </div>
    </div>
  );
};

export default BorrowSimple;
