import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Lock } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Supply", path: "/supply" },
    { name: "Borrow", path: "/borrow" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Shield className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              <Lock className="absolute top-1 left-1 h-4 w-4 text-secondary animate-pulse-glow" />
            </div>
            <span className="text-2xl font-bold text-gradient">FHE Lending</span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors relative group ${
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
                {location.pathname === item.path && (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" />
                )}
                <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>
            ))}
          </div>

          {/* Wallet Connect */}
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
