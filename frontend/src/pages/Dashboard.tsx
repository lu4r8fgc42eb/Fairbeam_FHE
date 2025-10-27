import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import { Wallet, TrendingUp, PieChart, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  const stats = [
    {
      title: "Net Worth",
      value: "$0.00",
      change: "+0%",
      icon: Wallet,
      trend: "up" as const,
    },
    {
      title: "Total Supplied",
      value: "$0.00",
      change: "+0%",
      icon: TrendingUp,
      trend: "up" as const,
    },
    {
      title: "Total Borrowed",
      value: "$0.00",
      icon: PieChart,
    },
    {
      title: "Net APY",
      value: "0%",
      change: "+0%",
      icon: DollarSign,
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
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-2">No active positions</p>
            <p className="text-sm text-muted-foreground">
              Connect your wallet and start supplying or borrowing assets
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
