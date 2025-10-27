import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AssetCardProps {
  name: string;
  symbol: string;
  icon: string;
  apy: string;
  balance: string;
  action: "supply" | "borrow";
  onAction: () => void;
}

const AssetCard = ({ name, symbol, icon, apy, balance, action, onAction }: AssetCardProps) => {
  return (
    <Card className="p-6 border-gradient card-glow hover:glow-green transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">{symbol}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">APY</span>
          <span className="text-sm font-medium text-secondary">{apy}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Balance</span>
          <span className="text-sm font-medium text-foreground">{balance}</span>
        </div>
      </div>

      <Button 
        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-primary-foreground font-semibold"
        onClick={onAction}
      >
        {action === "supply" ? "Supply" : "Borrow"}
      </Button>
    </Card>
  );
};

export default AssetCard;
