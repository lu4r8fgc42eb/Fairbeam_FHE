import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";

const Index = () => {
  const features = [
    {
      icon: Shield,
      title: "Fully Homomorphic Encryption",
      description: "Conduct transactions on encrypted data without revealing sensitive information"
    },
    {
      icon: Lock,
      title: "Complete Privacy",
      description: "Your lending and borrowing activities remain completely confidential"
    },
    {
      icon: Eye,
      title: "Transparent Yet Private",
      description: "Verifiable transactions while keeping your data encrypted"
    },
    {
      icon: Zap,
      title: "Instant Settlement",
      description: "Fast and efficient lending protocol with automated processes"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Powered by FHE Technology</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Private Lending
            <br />
            <span className="text-gradient animate-gradient">Without Compromise</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            The first decentralized lending platform leveraging Fully Homomorphic Encryption 
            for complete financial privacy
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold px-8 glow-cyan"
              >
                Launch App
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why Choose <span className="text-gradient">FHE Lending</span>?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 card-glow group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:glow-cyan transition-all">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 border-y border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-bold text-gradient mb-2">$0M+</p>
              <p className="text-muted-foreground">Total Value Locked</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-gradient mb-2">100%</p>
              <p className="text-muted-foreground">Privacy Guaranteed</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-gradient mb-2">0</p>
              <p className="text-muted-foreground">Active Users</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Experience <span className="text-gradient">True Privacy</span>?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Connect your wallet and start lending or borrowing with complete confidentiality
          </p>
          <Link to="/dashboard">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold px-8 glow-cyan"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground text-sm">
          <p>© 2024 FHE Lending. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
