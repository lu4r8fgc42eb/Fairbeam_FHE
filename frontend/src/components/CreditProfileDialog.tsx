import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useFHELending } from '@/hooks/useFHELending';
import { encryptUint16 } from '@/lib/fhe';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { useAccount, useWalletClient, useWaitForTransactionReceipt } from 'wagmi';
import { Shield, AlertCircle } from 'lucide-react';

export function CreditProfileDialog() {
  const { toast } = useToast();
  const { submitProfile, updateProfile, hasProfile, refetchAll } = useFHELending();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [open, setOpen] = useState(false);
  const [riskScore, setRiskScore] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Wait for transaction receipt
  const { isLoading: isWaitingForReceipt, isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setTxHash(undefined);

      if (!address || !walletClient) {
        throw new Error('Wallet not connected or provider unavailable');
      }

      // Encrypt risk score for CreditScoring contract
      const encrypted = await encryptUint16(
        riskScore,
        CONTRACT_ADDRESSES.CreditScoring,
        address,
        walletClient
      );

      // Submit or update profile based on whether user already has one
      const hash = hasProfile
        ? await updateProfile(encrypted.handle, encrypted.proof)
        : await submitProfile(encrypted.handle, encrypted.proof);
      setTxHash(hash);

      toast({
        title: 'Transaction Submitted',
        description: 'Waiting for confirmation...',
      });

      // Wait for the transaction to be confirmed
      // The useWaitForTransactionReceipt hook will handle the waiting
    } catch (error: any) {
      toast({
        title: hasProfile ? 'Update Failed' : 'Submission Failed',
        description: error.message || `Failed to ${hasProfile ? 'update' : 'submit'} credit profile`,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  // Handle transaction result
  useEffect(() => {
    if (isTxSuccess && isSubmitting) {
      toast({
        title: hasProfile ? 'Profile Updated Successfully' : 'Profile Submitted Successfully',
        description: `Risk score ${riskScore} encrypted and ${hasProfile ? 'updated' : 'submitted'} on-chain`,
      });
      setIsSubmitting(false);
      setTxHash(undefined);
      setOpen(false);
      // Refresh data to update hasProfile status
      refetchAll();
    }
  }, [isTxSuccess, isSubmitting]);

  // Handle transaction error
  useEffect(() => {
    if (isTxError && isSubmitting) {
      toast({
        title: 'Transaction Failed',
        description: 'The transaction was reverted on-chain. Please check the contract requirements.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      setTxHash(undefined);
    }
  }, [isTxError, isSubmitting]);

  const getRiskLevel = (score: number) => {
    if (score <= 300) return { label: 'Excellent', color: 'text-green-500' };
    if (score <= 600) return { label: 'Good', color: 'text-primary' };
    if (score <= 900) return { label: 'Fair', color: 'text-yellow-500' };
    return { label: 'Poor', color: 'text-destructive' };
  };

  const riskLevel = getRiskLevel(riskScore);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/50">
          <Shield className="h-4 w-4 mr-2" />
          Submit Credit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {hasProfile ? 'Update Credit Profile' : 'Submit Encrypted Credit Profile'}
          </DialogTitle>
          <DialogDescription>
            {hasProfile
              ? 'You already have a credit profile. You can update it with a new risk score.'
              : 'Your risk score will be encrypted using FHE before submission. Lower scores (≤ 600) qualify for better loan terms.'
            }
          </DialogDescription>
        </DialogHeader>

        {hasProfile && (
          <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-green-500">Profile Already Exists</p>
                <p className="text-sm text-muted-foreground">
                  You have already submitted a credit profile. You can update it below if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 py-4">
          {/* Risk Score Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="risk-score">Risk Score</Label>
              <span className={`text-2xl font-bold ${riskLevel.color}`}>
                {riskScore}
              </span>
            </div>

            <Slider
              id="risk-score"
              min={0}
              max={1000}
              step={10}
              value={[riskScore]}
              onValueChange={(value) => setRiskScore(value[0])}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 (Best)</span>
              <span className={`font-semibold ${riskLevel.color}`}>
                {riskLevel.label}
              </span>
              <span>1000 (Worst)</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-primary">Approval Requirements</p>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Risk score ≤ 600: Eligible for loans</li>
                  <li>Risk score &gt; 600: Loan requests will be rejected</li>
                  <li>200% collateralization required for all loans</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/30">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-secondary">🔐 Privacy:</span>{' '}
              Your risk score will be encrypted client-side using FHE.
              The contract will compute eligibility without revealing your actual score.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting || isWaitingForReceipt}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isWaitingForReceipt}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            {isSubmitting && !txHash ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Encrypting...
              </span>
            ) : isWaitingForReceipt ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Confirming on-chain...
              </span>
            ) : (
              hasProfile ? 'Update Profile' : 'Submit Profile'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
