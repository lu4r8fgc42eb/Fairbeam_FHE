import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, Code, Zap, CheckCircle2, Wallet, ArrowRight, ArrowDown, RefreshCw, Coins } from "lucide-react";
import Navbar from "@/components/Navbar";

const HowItWorks = () => {
  const features = [
    {
      icon: Shield,
      title: "Complete Privacy",
      description: "All amounts - collateral, borrows, debts, and repayments - are encrypted using FHE. Only you know your financial data.",
    },
    {
      icon: Lock,
      title: "Encrypted Computation",
      description: "Smart contracts perform collateral ratio checks and balance updates on encrypted values without decryption.",
    },
    {
      icon: Eye,
      title: "Zero Knowledge",
      description: "Even blockchain validators cannot see your loan amounts. Events emit only addresses, never amounts.",
    },
    {
      icon: Coins,
      title: "Confidential ETH (cETH)",
      description: "Wrapped ETH token with encrypted balances. All lending operations use cETH for full privacy.",
    },
  ];

  const userFlow = [
    {
      number: "01",
      title: "Wrap ETH to cETH",
      description: "Deposit ETH to receive Confidential ETH (cETH). Your cETH balance becomes encrypted immediately.",
      code: `cETH.wrap{value: 0.1 ether}()
// Balance: euint64 (encrypted)`,
      note: "Initial wrap amount is visible, but subsequent operations are private",
    },
    {
      number: "02",
      title: "Approve Lending Pool",
      description: "Grant the PrivateLendingPool permission to transfer your cETH for collateral and supply operations.",
      code: `cETH.setApprovalForAll(poolAddress, true)`,
      note: "One-time approval per pool",
    },
    {
      number: "03",
      title: "Deposit Collateral",
      description: "Deposit encrypted cETH as collateral. The amount is never revealed on-chain.",
      code: `// Client-side encryption
const { handle, proof } = encrypt(amount);

// On-chain (amount stays encrypted)
pool.depositCollateral(handle, proof)`,
      note: "Collateral amount is encrypted with FHE",
    },
    {
      number: "04",
      title: "Borrow cETH",
      description: "Borrow against your collateral. The pool validates the 200% collateral ratio using encrypted comparisons.",
      code: `// Encrypted collateral ratio check
collateral * 100 >= debt * 200  // All encrypted!

pool.borrow(encAmount, proof)`,
      note: "50% LTV enforced via encrypted math",
    },
    {
      number: "05",
      title: "Repay Debt",
      description: "Repay your encrypted debt. The repayment amount remains private.",
      code: `pool.repay(encAmount, proof)
// Debt reduced privately`,
      note: "Partial or full repayment supported",
    },
    {
      number: "06",
      title: "Withdraw & Unwrap",
      description: "Withdraw collateral after repayment, then unwrap cETH back to ETH when ready.",
      code: `pool.withdrawCollateral(encAmount, proof)
cETH.unwrap(amount)  // Reveals amount`,
      note: "You choose when to reveal by unwrapping",
    },
  ];

  const privacyComparison = [
    { operation: "Collateral Deposit", traditional: "Visible", fairbeam: "Encrypted" },
    { operation: "Borrow Amount", traditional: "Visible", fairbeam: "Encrypted" },
    { operation: "Debt Balance", traditional: "Visible", fairbeam: "Encrypted" },
    { operation: "Repayment Amount", traditional: "Visible", fairbeam: "Encrypted" },
    { operation: "Liquidation Threshold", traditional: "Visible", fairbeam: "Encrypted" },
  ];

  const benefits = [
    "No credit checks or KYC required",
    "Competitors cannot track your positions",
    "Protection from MEV front-running",
    "Private collateral ratios",
    "Confidential debt balances",
    "Censorship-resistant lending",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 lg:px-8 pt-32 pb-12">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-gradient">How Fairbeam Works</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Fully private DeFi lending powered by Fully Homomorphic Encryption.
              All amounts encrypted on-chain using Confidential ETH (cETH).
            </p>
          </div>

          {/* Demo Video Section */}
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
              Watch a complete walkthrough of Fairbeam's private lending platform
            </p>
          </Card>

          {/* Core Innovation: cETH */}
          <Card className="p-8 border-gradient card-glow">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gradient">
                  Confidential ETH (cETH)
                </h2>
                <p className="text-muted-foreground mb-4">
                  The key innovation in Fairbeam is <strong>cETH</strong> - a wrapped ETH token
                  with encrypted balances. Unlike regular ERC-20 tokens where balances are public,
                  cETH balances are stored as <code className="text-primary">euint64</code> encrypted values.
                </p>
                <p className="text-muted-foreground mb-4">
                  All lending operations (collateral, borrow, repay) use cETH, ensuring that
                  your financial activity remains completely private on-chain.
                </p>
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Zap className="h-5 w-5" />
                  <span>Powered by Zama fhEVM v0.9.1</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 p-6 rounded-lg border border-primary/20">
                <div className="space-y-4">
                  <div className="font-mono text-sm">
                    <div className="text-muted-foreground mb-2">// Traditional ERC-20</div>
                    <div className="text-red-500">mapping(address =&gt; uint256) balances;</div>
                    <div className="text-red-500 text-xs mt-1">// Anyone can see: 0x... has 1.5 ETH</div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                  <div className="font-mono text-sm">
                    <div className="text-muted-foreground mb-2">// Confidential ETH (cETH)</div>
                    <div className="text-green-500">mapping(address =&gt; euint64) _encBalances;</div>
                    <div className="text-green-500 text-xs mt-1">// On-chain: 0x... has 0x4a8f2b... (encrypted)</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Privacy Comparison Table */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-gradient">
              Privacy Comparison
            </h2>
            <Card className="p-6 border-gradient card-glow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary/20">
                      <th className="text-left py-4 px-4 font-semibold">Operation</th>
                      <th className="text-center py-4 px-4 font-semibold text-red-400">Traditional DeFi</th>
                      <th className="text-center py-4 px-4 font-semibold text-green-400">Fairbeam (cETH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {privacyComparison.map((row, index) => (
                      <tr key={index} className="border-b border-primary/10">
                        <td className="py-4 px-4 text-muted-foreground">{row.operation}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-red-400">
                            <span className="text-lg">&#10060;</span> {row.traditional}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <span className="text-lg">&#10004;</span> {row.fairbeam}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* User Flow Steps */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center text-gradient">
              Complete User Flow
            </h2>
            <div className="grid gap-6">
              {userFlow.map((step, index) => (
                <Card
                  key={index}
                  className="p-6 border-gradient card-glow"
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
                      <div className="bg-black/50 p-4 rounded-lg border border-primary/20 mb-3">
                        <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                          {step.code}
                        </pre>
                      </div>
                      <p className="text-xs text-primary/80 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {step.note}
                      </p>
                    </div>
                  </div>
                  {index < userFlow.length - 1 && (
                    <div className="flex justify-center mt-4">
                      <ArrowDown className="h-6 w-6 text-primary/50" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Architecture Diagram */}
          <Card className="p-8 border-gradient card-glow">
            <h2 className="text-3xl font-bold mb-6 text-gradient">
              Smart Contract Architecture
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    ConfidentialETH.sol
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Wrapped ETH with encrypted balances
                  </p>
                  <ul className="space-y-1 text-sm font-mono text-muted-foreground">
                    <li>• <span className="text-green-400">wrap()</span> - ETH → cETH</li>
                    <li>• <span className="text-green-400">unwrap()</span> - cETH → ETH</li>
                    <li>• <span className="text-green-400">transferEncrypted()</span> - Private transfer</li>
                    <li>• <span className="text-green-400">transferInternal()</span> - Pool operations</li>
                  </ul>
                </div>
                <div className="flex justify-center">
                  <ArrowDown className="h-6 w-6 text-primary/50" />
                </div>
                <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-purple-400" />
                    PrivateLendingPool.sol
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Fully encrypted lending operations
                  </p>
                  <ul className="space-y-1 text-sm font-mono text-muted-foreground">
                    <li>• <span className="text-purple-400">depositCollateral()</span> - Encrypted deposit</li>
                    <li>• <span className="text-purple-400">borrow()</span> - Encrypted loan</li>
                    <li>• <span className="text-purple-400">repay()</span> - Encrypted repayment</li>
                    <li>• <span className="text-purple-400">supply()</span> - Encrypted liquidity</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  FHE Operations Used
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded border border-primary/20 bg-black/30">
                    <code className="text-green-400">FHE.fromExternal(encAmount, proof)</code>
                    <p className="text-xs text-muted-foreground mt-1">Import encrypted value from user input</p>
                  </div>
                  <div className="p-3 rounded border border-primary/20 bg-black/30">
                    <code className="text-green-400">FHE.add(a, b) / FHE.sub(a, b)</code>
                    <p className="text-xs text-muted-foreground mt-1">Encrypted arithmetic for balance updates</p>
                  </div>
                  <div className="p-3 rounded border border-primary/20 bg-black/30">
                    <code className="text-green-400">FHE.mul(a, scalar)</code>
                    <p className="text-xs text-muted-foreground mt-1">Multiply for collateral ratio calculation</p>
                  </div>
                  <div className="p-3 rounded border border-primary/20 bg-black/30">
                    <code className="text-green-400">FHE.ge(a, b) → ebool</code>
                    <p className="text-xs text-muted-foreground mt-1">Encrypted comparison for ratio check</p>
                  </div>
                  <div className="p-3 rounded border border-primary/20 bg-black/30">
                    <code className="text-green-400">FHE.allow(value, address)</code>
                    <p className="text-xs text-muted-foreground mt-1">Grant permission to use encrypted value</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 p-6 bg-black/50 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Encrypted Collateral Ratio Check (200% = 50% LTV)</p>
              <pre className="text-green-400 font-mono text-sm overflow-x-auto">
{`// All values are euint64 (encrypted)
euint64 collateralScaled = FHE.mul(collateral, FHE.asEuint64(100));
euint64 debtScaled = FHE.mul(newDebt, FHE.asEuint64(200));
ebool sufficient = FHE.ge(collateralScaled, debtScaled);
// Result: encrypted boolean - nobody knows if true or false!`}
              </pre>
            </div>
          </Card>

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

          {/* Benefits Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border-gradient card-glow">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-400" />
                Traditional DeFi Problems
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">&#10060;</span>
                  <span className="text-muted-foreground">
                    All loan amounts publicly visible on Etherscan
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">&#10060;</span>
                  <span className="text-muted-foreground">
                    Competitors can track your collateral positions
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">&#10060;</span>
                  <span className="text-muted-foreground">
                    MEV bots can front-run your liquidations
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">&#10060;</span>
                  <span className="text-muted-foreground">
                    Your debt levels are permanent public record
                  </span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 border-gradient card-glow bg-gradient-to-br from-primary/5 to-purple-500/5">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Fairbeam Benefits
              </h3>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">&#10004;</span>
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Deployed Contracts */}
          <Card className="p-8 border-gradient card-glow">
            <h2 className="text-3xl font-bold mb-6 text-gradient">
              Deployed Contracts (Sepolia)
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border border-primary/20 bg-black/30">
                <h3 className="font-semibold text-primary mb-2">ConfidentialETH (cETH)</h3>
                <code className="text-xs text-muted-foreground break-all">
                  0xDC13A2f7fED5d396Efe5ce86F3AC0eCb2CA46643
                </code>
                <a
                  href="https://sepolia.etherscan.io/address/0xDC13A2f7fED5d396Efe5ce86F3AC0eCb2CA46643"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline block mt-2"
                >
                  View on Etherscan →
                </a>
              </div>
              <div className="p-4 rounded-lg border border-purple-500/20 bg-black/30">
                <h3 className="font-semibold text-purple-400 mb-2">PrivateLendingPool</h3>
                <code className="text-xs text-muted-foreground break-all">
                  0x1de445720AeFfCaf4ba0c055071AC891ef866133
                </code>
                <a
                  href="https://sepolia.etherscan.io/address/0x1de445720AeFfCaf4ba0c055071AC891ef866133"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:underline block mt-2"
                >
                  View on Etherscan →
                </a>
              </div>
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
                <h3 className="font-semibold mb-2 text-primary">fhEVM GitHub</h3>
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
    </div>
  );
};

export default HowItWorks;
