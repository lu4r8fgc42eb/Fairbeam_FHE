import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useConfidentialETH } from '@/hooks/useConfidentialETH';
import { usePrivateLendingPool } from '@/hooks/usePrivateLendingPool';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToastAction } from '@/components/ui/toast';
import { AlertCircle, TrendingUp, Shield, Wallet, ExternalLink, Lock, Unlock } from 'lucide-react';
import { CONTRACTS, NETWORK_CONFIG } from '@/config/contracts';
import { getExplorerTxUrl, formatTxHash } from '@/lib/utils';
import { formatEther } from 'viem';
import { useAccount, useWalletClient, useWaitForTransactionReceipt } from 'wagmi';
import { Link } from 'react-router-dom';

const Borrow = () => {
  const { toast } = useToast();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // cETH hook
  const {
    hasBalance: hasCethBalance,
    isPoolApproved,
    decryptBalance,
    refetchAll: refetchCeth,
  } = useConfidentialETH();

  // Private Lending Pool hook
  const {
    hasCollateral,
    hasDebt,
    collateralRatio,
    isPending,
    isConfirming,
    depositCollateral,
    withdrawCollateral,
    borrow,
    repay,
    decryptCollateral,
    decryptDebt,
    refetchAll: refetchLending,
  } = usePrivateLendingPool();

  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txType, setTxType] = useState<string>('');

  // Decrypted values
  const [decryptedCethBalance, setDecryptedCethBalance] = useState<string | null>(null);
  const [decryptedCollateral, setDecryptedCollateral] = useState<string | null>(null);
  const [decryptedDebt, setDecryptedDebt] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Wait for transaction receipt
  const { isLoading: isWaitingForReceipt, isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (address) {
      refetchCeth();
      refetchLending();
    }
  }, [address]);

  // Helper to create explorer action
  const createExplorerAction = (hash: string) => (
    <ToastAction
      altText="View on Explorer"
      onClick={() => window.open(getExplorerTxUrl(hash, NETWORK_CONFIG.chainId), '_blank')}
    >
      <ExternalLink className="h-3 w-3 mr-1" />
      View
    </ToastAction>
  );

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && isProcessing && txHash) {
      const explorerAction = createExplorerAction(txHash);
      switch (txType) {
        case 'deposit':
          toast({
            title: 'Collateral Deposited',
            description: `Successfully deposited cETH as collateral. Tx: ${formatTxHash(txHash)}`,
            action: explorerAction,
          });
          setCollateralAmount('');
          setDecryptedCollateral(null);
          setDecryptedCethBalance(null);
          break;
        case 'withdraw':
          toast({
            title: 'Collateral Withdrawn',
            description: `Successfully withdrawn collateral. Tx: ${formatTxHash(txHash)}`,
            action: explorerAction,
          });
          setCollateralAmount('');
          setDecryptedCollateral(null);
          setDecryptedCethBalance(null);
          break;
        case 'borrow':
          toast({
            title: 'Borrowed Successfully',
            description: `Loan received as encrypted cETH. Tx: ${formatTxHash(txHash)}`,
            action: explorerAction,
          });
          setBorrowAmount('');
          setDecryptedDebt(null);
          setDecryptedCethBalance(null);
          break;
        case 'repay':
          toast({
            title: 'Loan Repaid',
            description: `Successfully repaid loan. Tx: ${formatTxHash(txHash)}`,
            action: explorerAction,
          });
          setRepayAmount('');
          setDecryptedDebt(null);
          setDecryptedCethBalance(null);
          break;
      }
      setIsProcessing(false);
      setTxHash(undefined);
      setTxType('');
      refetchCeth();
      refetchLending();
    }
  }, [isTxSuccess, isProcessing]);

  // Handle transaction error
  useEffect(() => {
    if (isTxError && isProcessing && txHash) {
      toast({
        title: 'Transaction Failed',
        description: `Transaction reverted on-chain. Tx: ${formatTxHash(txHash)}`,
        variant: 'destructive',
        action: createExplorerAction(txHash),
      });
      setIsProcessing(false);
      setTxHash(undefined);
      setTxType('');
    }
  }, [isTxError, isProcessing]);

  const handleDecryptAll = async () => {
    try {
      setIsDecrypting(true);
      toast({
        title: 'Decrypting Balances...',
        description: 'Please sign the messages to decrypt your balances',
      });

      // Decrypt cETH balance
      if (hasCethBalance) {
        const balance = await decryptBalance(walletClient);
        setDecryptedCethBalance(formatEther(balance));
      }

      // Decrypt collateral
      if (hasCollateral) {
        const collateral = await decryptCollateral(walletClient);
        setDecryptedCollateral(formatEther(collateral));
      }

      // Decrypt debt
      if (hasDebt) {
        const debt = await decryptDebt(walletClient);
        setDecryptedDebt(formatEther(debt));
      }

      toast({
        title: 'Decryption Complete',
        description: 'All balances have been decrypted',
      });
    } catch (error: any) {
      toast({
        title: 'Decryption Failed',
        description: error.message || 'Failed to decrypt balances',
        variant: 'destructive',
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDepositCollateral = async () => {
    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid collateral amount',
        variant: 'destructive',
      });
      return;
    }

    if (!isPoolApproved) {
      toast({
        title: 'Approval Required',
        description: 'Please approve the lending pool first on the Wrap page',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxType('deposit');

      toast({
        title: 'Encrypting Amount...',
        description: 'Please sign the message to encrypt your deposit amount',
      });

      const hash = await depositCollateral(collateralAmount, walletClient);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: `Depositing encrypted collateral...`,
        action: createExplorerAction(hash),
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
      setTxType('withdraw');

      toast({
        title: 'Encrypting Amount...',
        description: 'Please sign the message to encrypt your withdrawal amount',
      });

      const hash = await withdrawCollateral(collateralAmount, walletClient);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: `Withdrawing encrypted collateral...`,
        action: createExplorerAction(hash),
      });
    } catch (error: any) {
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to withdraw. Check collateral ratio.',
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

    if (!hasCollateral) {
      toast({
        title: 'No Collateral',
        description: 'Please deposit collateral first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxType('borrow');

      toast({
        title: 'Encrypting Amount...',
        description: 'Please sign the message to encrypt your borrow amount',
      });

      const hash = await borrow(borrowAmount, walletClient);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: `Borrowing encrypted amount...`,
        action: createExplorerAction(hash),
      });
    } catch (error: any) {
      toast({
        title: 'Borrow Failed',
        description: error.message || 'Failed to borrow. Check collateral ratio.',
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

    if (!isPoolApproved) {
      toast({
        title: 'Approval Required',
        description: 'Please approve the lending pool first on the Wrap page',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxType('repay');

      toast({
        title: 'Encrypting Amount...',
        description: 'Please sign the message to encrypt your repayment amount',
      });

      const hash = await repay(repayAmount, walletClient);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: `Repaying encrypted amount...`,
        action: createExplorerAction(hash),
      });
    } catch (error: any) {
      toast({
        title: 'Repayment Failed',
        description: error.message || 'Failed to repay loan',
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
              <span className="text-gradient">Private Lending</span>
            </h1>
            <p className="text-muted-foreground">
              Borrow and repay with fully encrypted amounts using cETH
            </p>
          </div>
          <Button
            onClick={handleDecryptAll}
            disabled={isDecrypting || (!hasCethBalance && !hasCollateral && !hasDebt)}
            variant="outline"
          >
            <Unlock className="h-4 w-4 mr-2" />
            {isDecrypting ? 'Decrypting...' : 'Decrypt Balances'}
          </Button>
        </div>

        {/* Warning if not approved */}
        {!isPoolApproved && hasCethBalance && (
          <div className="mb-6 p-4 rounded-lg border border-secondary/30 bg-secondary/5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-secondary mb-1">Approval Required</p>
              <p className="text-sm text-muted-foreground">
                You need to approve the lending pool to use your cETH.{' '}
                <Link to="/wrap" className="text-primary hover:underline">
                  Go to Wrap page to approve
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Warning if no cETH */}
        {!hasCethBalance && (
          <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">Get Started with cETH</p>
              <p className="text-sm text-muted-foreground">
                You need cETH to use the private lending pool.{' '}
                <Link to="/wrap" className="text-primary hover:underline">
                  Wrap ETH to cETH first
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-gradient card-glow">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">cETH Balance</p>
            </div>
            {decryptedCethBalance !== null ? (
              <p className="text-2xl font-bold">{parseFloat(decryptedCethBalance).toFixed(4)} cETH</p>
            ) : hasCethBalance ? (
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Encrypted</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">0.0000 cETH</p>
            )}
          </Card>

          <Card className="p-6 border-gradient card-glow">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-green-500" />
              <p className="text-sm text-muted-foreground">Your Collateral</p>
            </div>
            {decryptedCollateral !== null ? (
              <p className="text-2xl font-bold text-green-500">{parseFloat(decryptedCollateral).toFixed(4)} cETH</p>
            ) : hasCollateral ? (
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Encrypted</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">0.0000 cETH</p>
            )}
          </Card>

          <Card className="p-6 border-gradient card-glow">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-destructive" />
              <p className="text-sm text-muted-foreground">Your Debt</p>
            </div>
            {decryptedDebt !== null ? (
              <p className="text-2xl font-bold text-destructive">{parseFloat(decryptedDebt).toFixed(4)} cETH</p>
            ) : hasDebt ? (
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Encrypted</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">0.0000 cETH</p>
            )}
          </Card>
        </div>

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
                <Label htmlFor="collateral">Amount (cETH)</Label>
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
                  disabled={isProcessing || isWaitingForReceipt || !collateralAmount || !isPoolApproved}
                  className="flex-1"
                >
                  {isProcessing && txType === 'deposit' ? 'Processing...' : 'Deposit'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWithdrawCollateral}
                  disabled={isProcessing || isWaitingForReceipt || !collateralAmount || !hasCollateral}
                  className="flex-1"
                >
                  {isProcessing && txType === 'withdraw' ? 'Processing...' : 'Withdraw'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {collateralRatio}% collateralization required. Max borrow = {100 * 100 / collateralRatio}% of collateral.
              </p>
            </div>
          </Card>

          {/* Borrow */}
          <Card className="p-6 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Borrow cETH</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="borrow">Amount (cETH)</Label>
                <Input
                  id="borrow"
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  disabled={isProcessing || isWaitingForReceipt || !hasCollateral}
                />
              </div>

              <Button
                onClick={handleBorrow}
                disabled={isProcessing || isWaitingForReceipt || !borrowAmount || !hasCollateral}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                {isProcessing && txType === 'borrow' ? 'Processing...' : 'Borrow'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Borrow amount is encrypted. Only you can see how much you borrowed.
              </p>
            </div>
          </Card>

          {/* Repay */}
          {hasDebt && (
            <Card className="p-6 card-glow md:col-span-2">
              <h3 className="text-xl font-bold mb-4">Repay Loan</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="repay">Repayment Amount (cETH)</Label>
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
                    disabled={isProcessing || isWaitingForReceipt || !repayAmount || !isPoolApproved}
                    className="w-full"
                  >
                    {isProcessing && txType === 'repay' ? 'Processing...' : 'Repay'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-6 rounded-xl border border-primary/30 bg-primary/5">
          <h3 className="text-lg font-semibold mb-2 text-primary">Full Privacy with cETH</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>All amounts are encrypted</strong> - collateral, borrow, and repay amounts are private</li>
            <li>Only you can decrypt your balances using the "Decrypt Balances" button</li>
            <li>{collateralRatio}% collateralization ratio - deposit {collateralRatio / 100}x your desired loan</li>
            <li>Collateral checks are performed on encrypted values using FHE</li>
            <li>Unwrap cETH to ETH when you want to exit with visible amounts</li>
          </ul>
        </div>

        {/* Contract Info */}
        <div className="mt-4 p-4 rounded-lg border border-muted bg-muted/5">
          <p className="text-xs text-muted-foreground">
            <strong>Lending Pool:</strong>{' '}
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACTS.PrivateLendingPool}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {CONTRACTS.PrivateLendingPool}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Borrow;
