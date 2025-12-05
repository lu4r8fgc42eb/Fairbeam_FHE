import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useConfidentialETH } from '@/hooks/useConfidentialETH';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToastAction } from '@/components/ui/toast';
import { Wallet, ArrowDownUp, Shield, Lock, Unlock, ExternalLink, CheckCircle2 } from 'lucide-react';
import { CONTRACTS, NETWORK_CONFIG } from '@/config/contracts';
import { getExplorerTxUrl, formatTxHash } from '@/lib/utils';
import { formatEther } from 'viem';
import { useAccount, useWalletClient, useWaitForTransactionReceipt } from 'wagmi';

const Wrap = () => {
  const { toast } = useToast();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const {
    ethBalance,
    hasBalance,
    isPoolApproved,
    isPending,
    isConfirming,
    wrap,
    unwrap,
    approveLendingPool,
    decryptBalance,
    refetchAll,
  } = useConfidentialETH();

  const [wrapAmount, setWrapAmount] = useState('');
  const [unwrapAmount, setUnwrapAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txType, setTxType] = useState<string>('');
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Wait for transaction receipt
  const { isLoading: isWaitingForReceipt, isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (address) {
      refetchAll();
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
        case 'wrap':
          toast({
            title: 'ETH Wrapped Successfully',
            description: `Wrapped ${wrapAmount} ETH to cETH. Tx: ${formatTxHash(txHash)}`,
            action: explorerAction,
          });
          setWrapAmount('');
          setDecryptedBalance(null); // Reset decrypted balance
          break;
        case 'unwrap':
          toast({
            title: 'cETH Unwrapped Successfully',
            description: `Unwrapped ${unwrapAmount} cETH to ETH. Tx: ${formatTxHash(txHash)}`,
            action: explorerAction,
          });
          setUnwrapAmount('');
          setDecryptedBalance(null);
          break;
        case 'approve':
          toast({
            title: 'Lending Pool Approved',
            description: `Lending pool can now transfer your cETH. Tx: ${formatTxHash(txHash)}`,
            action: explorerAction,
          });
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

  const handleWrap = async () => {
    if (!wrapAmount || parseFloat(wrapAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to wrap',
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(wrapAmount) > parseFloat(ethBalance)) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${parseFloat(ethBalance).toFixed(4)} ETH`,
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(wrapAmount) > 18.4) {
      toast({
        title: 'Amount Too Large',
        description: 'Maximum wrap amount is 18.4 ETH per transaction',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxType('wrap');

      const hash = await wrap(wrapAmount);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: `Wrapping ${wrapAmount} ETH to cETH...`,
        action: createExplorerAction(hash),
      });
    } catch (error: any) {
      toast({
        title: 'Wrap Failed',
        description: error.message || 'Failed to wrap ETH',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  const handleUnwrap = async () => {
    if (!unwrapAmount || parseFloat(unwrapAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to unwrap',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setTxType('unwrap');

      const hash = await unwrap(unwrapAmount);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: `Unwrapping ${unwrapAmount} cETH to ETH...`,
        action: createExplorerAction(hash),
      });
    } catch (error: any) {
      toast({
        title: 'Unwrap Failed',
        description: error.message || 'Failed to unwrap cETH. Ensure you have sufficient balance.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      setTxType('approve');

      const hash = await approveLendingPool();
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: 'Approving lending pool...',
        action: createExplorerAction(hash),
      });
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve lending pool',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setTxType('');
    }
  };

  const handleDecryptBalance = async () => {
    if (!hasBalance) {
      toast({
        title: 'No Balance',
        description: 'You have no cETH balance to decrypt',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDecrypting(true);
      toast({
        title: 'Decrypting Balance...',
        description: 'Please sign the message to decrypt your balance',
      });

      const balance = await decryptBalance(walletClient);
      setDecryptedBalance(formatEther(balance));

      toast({
        title: 'Balance Decrypted',
        description: `Your cETH balance: ${formatEther(balance)} cETH`,
      });
    } catch (error: any) {
      toast({
        title: 'Decryption Failed',
        description: error.message || 'Failed to decrypt balance',
        variant: 'destructive',
      });
    } finally {
      setIsDecrypting(false);
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
              Please connect your wallet to wrap/unwrap ETH
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient">Wrap ETH to cETH</span>
          </h1>
          <p className="text-muted-foreground">
            Convert ETH to Confidential ETH for private lending operations
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-gradient card-glow">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">ETH Balance</p>
            </div>
            <p className="text-2xl font-bold">{parseFloat(ethBalance).toFixed(4)} ETH</p>
          </Card>

          <Card className="p-6 border-gradient card-glow">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">cETH Balance</p>
            </div>
            {decryptedBalance !== null ? (
              <p className="text-2xl font-bold text-primary">{parseFloat(decryptedBalance).toFixed(4)} cETH</p>
            ) : hasBalance ? (
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Encrypted</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecryptBalance}
                  disabled={isDecrypting}
                >
                  {isDecrypting ? 'Decrypting...' : 'Decrypt'}
                </Button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">0.0000 cETH</p>
            )}
          </Card>

          <Card className="p-6 border-gradient card-glow">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Pool Approval</p>
            </div>
            {isPoolApproved ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-green-500">Approved</span>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg text-muted-foreground">Not Approved</span>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isProcessing || isWaitingForReceipt}
                >
                  Approve
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Wrap Card */}
          <Card className="p-6 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Wrap ETH</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="wrap">Amount (ETH)</Label>
                <Input
                  id="wrap"
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={wrapAmount}
                  onChange={(e) => setWrapAmount(e.target.value)}
                  disabled={isProcessing || isWaitingForReceipt}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {parseFloat(ethBalance).toFixed(4)} ETH
                </p>
              </div>

              <Button
                onClick={handleWrap}
                disabled={isProcessing || isWaitingForReceipt || !wrapAmount}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                {isProcessing && txType === 'wrap' ? 'Processing...' : 'Wrap ETH to cETH'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Wrapping converts ETH to encrypted cETH. The initial wrap amount is visible,
                but subsequent transfers and lending operations are fully private.
              </p>
            </div>
          </Card>

          {/* Unwrap Card */}
          <Card className="p-6 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <Unlock className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Unwrap cETH</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="unwrap">Amount (cETH)</Label>
                <Input
                  id="unwrap"
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={unwrapAmount}
                  onChange={(e) => setUnwrapAmount(e.target.value)}
                  disabled={isProcessing || isWaitingForReceipt || !hasBalance}
                />
                {decryptedBalance !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {parseFloat(decryptedBalance).toFixed(4)} cETH
                  </p>
                )}
              </div>

              <Button
                onClick={handleUnwrap}
                disabled={isProcessing || isWaitingForReceipt || !unwrapAmount || !hasBalance}
                className="w-full"
                variant="outline"
              >
                {isProcessing && txType === 'unwrap' ? 'Processing...' : 'Unwrap cETH to ETH'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Unwrapping converts cETH back to ETH. The unwrap amount is visible on-chain.
                Only unwrap when you're ready to reveal the amount.
              </p>
            </div>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-6 rounded-xl border border-primary/30 bg-primary/5">
          <h3 className="text-lg font-semibold mb-2 text-primary">How Confidential ETH Works</h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li><strong>Wrap:</strong> Convert ETH to cETH. The wrap amount is visible (unavoidable), but your cETH balance is encrypted.</li>
            <li><strong>Transfer:</strong> Send cETH with encrypted amounts. Observers only see the sender and recipient, not the amount.</li>
            <li><strong>Lending:</strong> Use cETH for fully private collateral deposits, borrowing, and repayments.</li>
            <li><strong>Unwrap:</strong> Convert cETH back to ETH when ready. You control when to reveal amounts.</li>
          </ul>
        </div>

        {/* Contract Info */}
        <div className="mt-4 p-4 rounded-lg border border-muted bg-muted/5">
          <p className="text-xs text-muted-foreground">
            <strong>cETH Contract:</strong>{' '}
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACTS.ConfidentialETH}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {CONTRACTS.ConfidentialETH}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Wrap;
