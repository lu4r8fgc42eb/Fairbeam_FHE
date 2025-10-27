import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useFHELending } from '@/hooks/useFHELending';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Wallet, DollarSign } from 'lucide-react';
import { useAccount } from 'wagmi';

const Supply = () => {
  const { toast } = useToast();
  const { address } = useAccount();
  const {
    poolLiquidity,
    isPending,
    isConfirming,
    addLiquidity,
    removeLiquidity,
    refetchAll,
  } = useFHELending();

  const [supplyAmount, setSupplyAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (address) {
      refetchAll();
    }
  }, [address]);

  const handleAddLiquidity = async () => {
    if (!supplyAmount || parseFloat(supplyAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid supply amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await addLiquidity(supplyAmount);

      toast({
        title: 'Liquidity Added',
        description: `Successfully supplied ${supplyAmount} ETH to the pool`,
      });

      setSupplyAmount('');
      setTimeout(() => refetchAll(), 2000);
    } catch (error: any) {
      toast({
        title: 'Supply Failed',
        description: error.message || 'Failed to add liquidity',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await removeLiquidity(withdrawAmount);

      toast({
        title: 'Liquidity Removed',
        description: `Successfully withdrawn ${withdrawAmount} ETH from the pool`,
      });

      setWithdrawAmount('');
      setTimeout(() => refetchAll(), 2000);
    } catch (error: any) {
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to remove liquidity',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
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
              Please connect your wallet to supply liquidity
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
            <span className="text-gradient">Supply Liquidity</span>
          </h1>
          <p className="text-muted-foreground">
            Earn passive income by providing liquidity
          </p>
        </div>

        <Card className="p-6 border-gradient card-glow mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Pool Liquidity</p>
              <p className="text-3xl font-bold text-primary">{parseFloat(poolLiquidity).toFixed(4)} ETH</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estimated APY</p>
              <p className="text-3xl font-bold text-green-500">~5.2%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="text-2xl font-bold text-foreground">Active</p>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Supply ETH</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="supply">Amount (ETH)</Label>
                <Input
                  id="supply"
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={supplyAmount}
                  onChange={(e) => setSupplyAmount(e.target.value)}
                  disabled={isProcessing || isPending || isConfirming}
                />
              </div>

              <Button
                onClick={handleAddLiquidity}
                disabled={isProcessing || isPending || isConfirming || !supplyAmount}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                {isProcessing || isPending || isConfirming ? 'Processing...' : 'Supply Liquidity'}
              </Button>
            </div>
          </Card>

          <Card className="p-6 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Withdraw ETH</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="withdraw">Amount (ETH)</Label>
                <Input
                  id="withdraw"
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={isProcessing || isPending || isConfirming}
                />
              </div>

              <Button
                onClick={handleRemoveLiquidity}
                disabled={isProcessing || isPending || isConfirming || !withdrawAmount}
                variant="outline"
                className="w-full"
              >
                {isProcessing || isPending || isConfirming ? 'Processing...' : 'Withdraw Liquidity'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-8 p-6 rounded-xl border border-primary/30 bg-primary/5">
          <h3 className="text-lg font-semibold mb-2 text-primary">🔒 Privacy Guaranteed</h3>
          <p className="text-sm text-muted-foreground">
            All supply transactions are recorded transparently, but borrower identities
            are protected by FHE. You earn interest without knowing who borrows your funds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Supply;
