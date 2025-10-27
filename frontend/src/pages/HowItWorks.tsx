import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, Code, Zap, CheckCircle2 } from "lucide-react";

const HowItWorks = () => {
  const features = [
    {
      icon: Shield,
      title: "Complete Privacy",
      description: "Your financial data remains encrypted on-chain. Loan amounts, credit scores, and collateral details are never exposed.",
    },
    {
      icon: Lock,
      title: "Encrypted Computation",
      description: "Smart contracts perform calculations on encrypted data without ever decrypting it, using Fully Homomorphic Encryption (FHE).",
    },
    {
      icon: Eye,
      title: "Zero Knowledge",
      description: "Even blockchain validators and other users cannot see your sensitive financial information.",
    },
    {
      icon: Code,
      title: "Smart Contract Logic",
      description: "All lending rules, liquidation checks, and interest calculations happen on encrypted values automatically.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Deposit Collateral",
      description: "Your ETH collateral amount is encrypted using FHE before being stored on-chain. Only you know the exact amount.",
      code: "encrypt(collateralAmount) → encryptedCollateral",
    },
    {
      number: "02",
      title: "Request Loan",
      description: "Submit an encrypted borrow request. The smart contract evaluates your eligibility without seeing the actual amount.",
      code: "encrypt(borrowAmount) → encryptedBorrow",
    },
    {
      number: "03",
      title: "Encrypted Validation",
      description: "The contract performs encrypted comparisons to verify collateral ratio, available liquidity, and credit limits.",
      code: "FHE.lt(encryptedBorrow, encryptedLimit) → approved",
    },
    {
      number: "04",
      title: "Claim Funds",
      description: "If approved, you provide the plaintext amount you requested. The contract validates it matches the encrypted request and disburses funds.",
      code: "validate(plaintext, encrypted) → transfer(funds)",
    },
  ];

  const benefits = [
    "No credit checks or KYC required",
    "Competitors cannot see your trading positions",
    "Protection from MEV and front-running attacks",
    "Private credit scores and risk profiles",
    "Confidential loan amounts and terms",
    "Censorship-resistant financial access",
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gradient">How It Works</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Privacy-preserving lending powered by Fully Homomorphic Encryption (FHE).
            Borrow and lend without revealing your financial data.
          </p>
        </div>

        {/* Demo Video Section - Moved to top */}
        <Card className="p-8 border-gradient card-glow">
          <h2 className="text-3xl font-bold mb-6 text-center text-gradient">
            Demo Video
          </h2>
          <div className="aspect-video rounded-lg overflow-hidden border border-primary/20">
            <video
              controls
              className="w-full h-full"
              poster="/video-poster.jpg"
            >
              <source src="/video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Watch a complete walkthrough of Fairbeam's FHE lending platform
          </p>
        </Card>

        {/* What is FHE */}
        <Card className="p-8 border-gradient card-glow">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4 text-gradient">
                What is Fully Homomorphic Encryption?
              </h2>
              <p className="text-muted-foreground mb-4">
                FHE is a revolutionary encryption technique that allows computations to be performed
                directly on encrypted data without ever decrypting it.
              </p>
              <p className="text-muted-foreground mb-4">
                This means smart contracts can process your financial information, make lending decisions,
                and execute transactions while keeping all sensitive data completely private.
              </p>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Zap className="h-5 w-5" />
                <span>Powered by Zama's fhEVM</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 p-8 rounded-lg border border-primary/20">
              <div className="space-y-4">
                <div className="font-mono text-sm">
                  <div className="text-muted-foreground mb-2">// Traditional Blockchain</div>
                  <div className="text-red-500">❌ amount = 1000 ETH</div>
                  <div className="text-red-500">❌ visible to everyone</div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                <div className="font-mono text-sm">
                  <div className="text-muted-foreground mb-2">// With FHE</div>
                  <div className="text-green-500">✓ amount = encrypt(1000)</div>
                  <div className="text-green-500">✓ encrypted: 0x4a8f...</div>
                  <div className="text-green-500">✓ private & secure</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Why Privacy Matters */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center text-gradient">
            Why Privacy Matters in DeFi
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border-gradient card-glow">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Traditional DeFi Problems
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span className="text-muted-foreground">
                    All transactions are public - competitors can see your positions
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span className="text-muted-foreground">
                    MEV bots can front-run your trades based on your visible intentions
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span className="text-muted-foreground">
                    Your entire financial history is permanently exposed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span className="text-muted-foreground">
                    Whales and institutions have information advantage
                  </span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 border-gradient card-glow bg-gradient-to-br from-primary/5 to-purple-500/5">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                FHE Lending Benefits
              </h3>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* How It Works Steps */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-center text-gradient">
            The Lending Process
          </h2>
          <div className="grid gap-6">
            {steps.map((step, index) => (
              <Card
                key={index}
                className="p-6 border-gradient card-glow hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <div className="bg-black/50 p-4 rounded-lg border border-primary/20">
                      <code className="text-sm text-green-400 font-mono">
                        {step.code}
                      </code>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-center text-gradient">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 border-gradient card-glow text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <Card className="p-8 border-gradient card-glow">
          <h2 className="text-3xl font-bold mb-6 text-gradient">
            Technical Implementation
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Smart Contract Architecture
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>FHELendingWithDecrypt.sol</strong> - Main lending contract</li>
                <li>• <strong>CollateralManager.sol</strong> - Handles encrypted collateral</li>
                <li>• <strong>LiquidityPool.sol</strong> - Manages lending pool</li>
                <li>• <strong>CreditScoring.sol</strong> - Private credit evaluation</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                FHE Operations
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>euint64</strong> - Encrypted 64-bit unsigned integers</li>
                <li>• <strong>FHE.lt/gt/eq</strong> - Encrypted comparisons</li>
                <li>• <strong>FHE.add/sub</strong> - Encrypted arithmetic</li>
                <li>• <strong>FHE.allow</strong> - Permission management</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-6 bg-black/50 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">Example: Encrypted Collateral Check</p>
            <pre className="text-green-400 font-mono text-sm overflow-x-auto">
{`// Check if collateral is sufficient (all encrypted)
ebool sufficient = FHE.lte(
  borrowAmount,
  FHE.div(collateralAmount, collateralRatio)
);

// Execute loan based on encrypted result
FHE.req(sufficient); // Reverts if false`}
            </pre>
          </div>
        </Card>

        {/* Resources */}
        <Card className="p-8 border-gradient card-glow bg-gradient-to-br from-primary/5 to-purple-500/5">
          <h2 className="text-3xl font-bold mb-6 text-center text-gradient">
            Learn More
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <a
              href="https://docs.zama.ai/fhevm"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors bg-background/50 backdrop-blur"
            >
              <h3 className="font-semibold mb-2 text-primary">Zama fhEVM Docs</h3>
              <p className="text-sm text-muted-foreground">
                Official documentation for FHE smart contracts
              </p>
            </a>
            <a
              href="https://github.com/zama-ai/fhevm"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors bg-background/50 backdrop-blur"
            >
              <h3 className="font-semibold mb-2 text-primary">GitHub Repository</h3>
              <p className="text-sm text-muted-foreground">
                Explore the source code and examples
              </p>
            </a>
            <a
              href="https://www.zama.ai/post/fhevm-confidential-smart-contracts"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors bg-background/50 backdrop-blur"
            >
              <h3 className="font-semibold mb-2 text-primary">Technical Blog</h3>
              <p className="text-sm text-muted-foreground">
                Deep dive into FHE technology and use cases
              </p>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HowItWorks;
