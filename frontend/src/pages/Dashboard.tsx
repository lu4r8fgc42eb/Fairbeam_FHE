import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import { Wallet, TrendingUp, PieChart, DollarSign, Droplets, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useFHELendingWithDecrypt } from "@/hooks/useFHELendingWithDecrypt";
import { useAccount } from "wagmi";

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const {
    collateral,
    outstandingDebt,
    maxBorrowable,
    availableLiquidity,
  } = useFHELendingWithDecrypt();

  // Calculate net worth (collateral - debt)
  const netWorth = parseFloat(collateral) - parseFloat(outstandingDebt);

  // Calculate health factor (collateral / debt ratio)
  const healthFactor = parseFloat(outstandingDebt) > 0
    ? ((parseFloat(collateral) / parseFloat(outstandingDebt)) * 100).toFixed(0)
    : '∞';

  const stats = [
    {
      title: "Your Collateral",
      value: `${parseFloat(collateral).toFixed(4)} ETH`,
      change: isConnected ? undefined : "Connect Wallet",
      icon: Wallet,
      trend: "up" as const,
    },
    {
      title: "Your Debt",
      value: `${parseFloat(outstandingDebt).toFixed(4)} ETH`,
      change: parseFloat(outstandingDebt) > 0 ? `Health: ${healthFactor}%` : undefined,
      icon: PieChart,
      trend: parseFloat(outstandingDebt) > 0 ? "down" as const : undefined,
    },
    {
      title: "Available to Borrow",
      value: `${parseFloat(maxBorrowable).toFixed(4)} ETH`,
      change: `Max: ${parseFloat(maxBorrowable).toFixed(4)} ETH`,
      icon: TrendingUp,
      trend: "up" as const,
    },
    {
      title: "Pool Liquidity",
      value: `${parseFloat(availableLiquidity).toFixed(4)} ETH`,
      change: "Total Available",
      icon: Droplets,
      trend: "up" as const,
    },
  ];

  return (
    <div className="min-h-screen pb-12">
      <Navbar />
      
      <div className="container mx-auto px-4 lg:px-8 pt-32">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Overview of your lending and borrowing activities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Activity Section */}
        <Card className="p-8 border-gradient card-glow">
          <h2 className="text-2xl font-bold mb-6 text-gradient">Your Positions</h2>

          {!isConnected ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-2">No active positions</p>
              <p className="text-sm text-muted-foreground">
                Connect your wallet and start supplying or borrowing assets
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Collateral Position */}
              {parseFloat(collateral) > 0 && (
                <div className="p-6 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Collateral Supplied</h3>
                        <p className="text-sm text-muted-foreground">ETH Collateral</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{parseFloat(collateral).toFixed(4)} ETH</p>
                      <p className="text-sm text-muted-foreground">
                        Available: {parseFloat(maxBorrowable).toFixed(4)} ETH
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Borrowing Position */}
              {parseFloat(outstandingDebt) > 0 && (
                <div className="p-6 rounded-lg bg-gradient-to-r from-orange-500/5 to-orange-500/10 border border-orange-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <PieChart className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Active Borrow</h3>
                        <p className="text-sm text-muted-foreground">Outstanding Debt</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-500">{parseFloat(outstandingDebt).toFixed(4)} ETH</p>
                      <p className="text-sm text-muted-foreground">
                        Health Factor: {healthFactor}%
                      </p>
                    </div>
                  </div>
                  {typeof healthFactor === 'string' && parseInt(healthFactor) < 150 && (
                    <div className="mt-3 p-3 rounded bg-orange-500/10 border border-orange-500/30">
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        ⚠️ Low health factor. Consider adding more collateral to avoid liquidation.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Net Worth Summary */}
              <div className="p-6 rounded-lg bg-gradient-to-r from-blue-500/5 to-blue-500/10 border border-blue-500/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Net Worth</h3>
                      <p className="text-sm text-muted-foreground">Collateral - Debt</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {netWorth >= 0 ? '+' : ''}{netWorth.toFixed(4)} ETH
                    </p>
                  </div>
                </div>
              </div>

              {/* No Positions */}
              {parseFloat(collateral) === 0 && parseFloat(outstandingDebt) === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground mb-2">No active positions yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start by supplying collateral or borrowing assets
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
