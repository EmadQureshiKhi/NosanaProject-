# Nosana Builders Challenge: Solana AI Agent

![Agent-101](./assets/NosanaBuildersChallengeAgents.jpg)

## 🚀 Project Overview

This project is a comprehensive Solana blockchain AI agent built for the **Nosana Builders Challenge**. The agent provides advanced DeFi capabilities including token analysis, portfolio management, cross-chain swaps, token launches, and comprehensive risk assessment tools.

### 🎯 What This Agent Does

The Solana AI Agent is a sophisticated blockchain assistant that can:
- **Search and analyze tokens** with real-time price data and market metrics
- **Manage wallet portfolios** with detailed balance tracking and validation
- **Execute token swaps** using Jupiter Exchange with confirmation workflows
- **Launch new tokens** on Pump.fun with complete parameter validation
- **Perform cross-chain swaps** using Mayan Finance for bridging assets
- **Analyze bundle activity** to detect coordinated buying and sniper behavior
- **Track NFT collections** with floor price data and collection statistics
- **Send SOL transactions** with secure confirmation processes

## 🔗 Links

- **🎥 Demo Video:** [Watch on YouTube](https://youtu.be/FlEa6RBB_QM)
- **🐦 Twitter/X:** [@thecorgod1234](https://x.com/thecorgod1234)
- **🌐 Nosana Deployment:** [Live Agent](https://dashboard.nosana.com/jobs/Dy5QeeVVk3XnwNaVvgWZ93LHRWoX6CeUF3d4hFZpexr4)
- **🐳 Docker Hub:** `docker pull thecorgod/agent-challenge:latest`
- - **🐦 My Tweet:** [Check it out here](https://x.com/thecorgod1234/status/1944694271396745432)

## 🛠️ Technology Stack

- **Framework:** [Mastra](https://mastra.ai) - TypeScript framework for AI applications
- **Blockchain:** Solana with Jupiter Exchange, MagicEden, Pumpfun and many more integrations
- **Cross-chain:** Mayan Finance for bridging
- **Database:** LibSQL for persistent storage
- **Runtime:** Node.js 20+ with TypeScript
- **Package Manager:** pnpm (recommended)

## 📋 Prerequisites

Before setting up the project, ensure you have:

- **Node.js 20.9.0 or higher** - [Download here](https://nodejs.org/)
- **pnpm** - Install with `npm install -g pnpm`
- **Git** - For cloning the repository
- **Docker** (optional) - For containerized deployment

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/agent-challenge.git
cd agent-challenge
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Configure your environment variables in `.env`:

```env
# LLM Configuration
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL=http://127.0.0.1:11434/api

# Solana Configuration (Optional - for transactions)
WALLET_PRIVATE_KEY=your_solana_private_key_here
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=your_helius_key

# Alternative: Use Nosana Endpoint
# MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
# API_BASE_URL=https://dashboard.nosana.com/jobs/GPVMUckqjKR6FwqnxDeDRqbn34BH7gAa5xWnWuNH1drf
```

### 4. Set Up Local LLM (Option A - Recommended for Development)

Install and run Ollama:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull the model
ollama pull qwen2.5:1.5b
```

### 5. Start the Development Server

```bash
pnpm run dev
```

The agent will be available at `http://localhost:8080`

## 🏗️ Project Structure

```
src/mastra/
├── agents/
│   ├── solana-agent/          # Main Solana blockchain agent
│   │   ├── solana-agent.ts    # Agent configuration and instructions
│   │   ├── tools/             # Individual tool implementations
│   │   └── utils/             # Utility functions
│   └── weather-agent/         # Example weather agent (can be removed)
├── workflows/                 # Complex multi-step workflows
│   ├── solana-portfolio-analysis.ts
│   ├── token-research.ts
│   ├── token-launch-workflow.ts
│   └── trading-workflow.ts
├── config.ts                  # LLM and environment configuration
└── index.ts                   # Main Mastra application setup
```

## 🔧 Tools & Capabilities

### 🔍 Token Analysis Tools

#### `searchToken`
- **Purpose:** Search for Solana tokens by name, symbol, or address
- **Features:** Uses Jupiter's verified token list with metadata enrichment
- **Usage:** "search for BONK" or "find token SOL"

#### `tokenInfo`
- **Purpose:** Get comprehensive token profiles with market data
- **Features:** Price, market cap, volume, social links, DexScreener integration
- **Usage:** "tokeninfo BONK" or "show me details about this token"

#### `bundleChecker`
- **Purpose:** Analyze tokens for coordinated buying and sniper activity
- **Features:** Detects bundle patterns, creator risk assessment, rug analysis
- **Usage:** "check if [mint_address] is bundled"

### 💰 Portfolio Management

#### `getWalletPortfolio`
- **Purpose:** Analyze Solana wallet holdings with USD valuations
- **Features:** SOL balance, token holdings, price validation, dust filtering
- **Usage:** "check wallet [wallet_address]"

#### `getNFTPortfolio`
- **Purpose:** Display NFT collections with floor prices
- **Features:** Magic Eden integration, collection stats, estimated values
- **Usage:** "show NFTs for wallet [wallet_address]"

### 💱 Trading & Swaps

#### `swapTokens` & `confirmSwap`
- **Purpose:** Execute token swaps on Jupiter Exchange
- **Features:** Price preview, slippage protection, confirmation workflow
- **Usage:** "buy 0.01 SOL of BONK" → "confirm swap"

#### `prepareCrossChainSwap` & `confirmCrossChainSwap`
- **Purpose:** Bridge tokens between Solana and EVM chains
- **Features:** Mayan Finance integration, multi-chain support
- **Usage:** "bridge 1 USDC from solana to ethereum [address]" → "confirm cross-chain swap"

### 🚀 Token Creation

#### `launchPumpFunToken`
- **Purpose:** Launch new tokens on Pump.fun
- **Features:** Parameter validation, image URL verification, cost estimation
- **Usage:** Provide token name, ticker, description, image URL, and liquidity options

### 💸 SOL Transactions

#### `sendSolTransaction` & `confirmTransaction`
- **Purpose:** Send SOL with secure confirmation
- **Features:** Balance checking, fee estimation, safety limits
- **Usage:** "send 0.001 SOL to [address]" → "yes"

## 🔄 Workflows

### Portfolio Analysis Workflow
Comprehensive wallet analysis combining:
- Token holdings with price validation
- Bundle risk assessment for top holdings
- NFT collection analysis
- Risk scoring and recommendations

### Token Research Workflow
Deep token analysis including:
- Token search and metadata
- Market data and price analysis
- Bundle activity detection
- Investment risk rating

### Trading Workflow
Complete trading process with:
- Pre-trade portfolio analysis
- Token risk assessment
- Trade execution with confirmations
- Post-trade analysis and recommendations

### Token Launch Workflow
End-to-end token creation:
- Parameter validation
- Similarity checking
- Token launch execution
- Launch verification and reporting

## 🐳 Docker Deployment

### Build the Docker Image

```bash
docker build -t yourusername/agent-challenge:latest .
```

### Run Locally

```bash
docker run -p 8080:8080 yourusername/agent-challenge:latest
```

### Push to Registry

```bash
docker login
docker push yourusername/agent-challenge:latest
```

## 🌐 Nosana Deployment

### 1. Update Job Definition

Edit `nos_job_def/nosana_mastra.json` with your Docker image:

```json
{
  "ops": [
    {
      "id": "agents",
      "args": {
        "gpu": true,
        "image": "docker.io/yourusername/agent-challenge:latest",
        "expose": [
          {
            "port": 8080
          }
        ]
      },
      "type": "container/run"
    }
  ],
  "meta": {
    "trigger": "dashboard",
    "system_requirements": {
      "required_vram": 4
    }
  },
  "type": "container",
  "version": "0.1"
}
```

### 2. Deploy Using Nosana CLI

```bash
# Install Nosana CLI
npm install -g @nosana/cli

# Get your wallet address and fund it
nosana address

# Deploy to Nosana
nosana job post --file nos_job_def/nosana_mastra.json --market nvidia-3060 --timeout 30
```

### 3. Deploy Using Nosana Dashboard

1. Visit [Nosana Dashboard](https://dashboard.nosana.com/deploy)
2. Connect your Phantom wallet
3. Copy and paste your job definition
4. Select appropriate GPU tier
5. Click "Deploy"

## 🧪 Testing

### Run Workflows

```bash
pnpm run test:workflows
```


## 🔒 Security Considerations

- **Private Keys:** Never commit private keys to version control
- **Environment Variables:** Use secure secret management in production
- **API Keys:** Rotate keys regularly and use least-privilege access
- **Transaction Limits:** Built-in safety limits prevent large accidental transactions

## 🎯 Example Usage

### Basic Token Analysis
```
User: "search for BONK"
Agent: [Shows token info with mint address, price, volume]

User: "show me more details"
Agent: [Displays comprehensive token profile with market data]

User: "check if this is bundled"
Agent: [Analyzes bundle activity and provides risk assessment]
```

### Portfolio Management
```
User: "check wallet 2Dk2je4iif7yttyGMLbjc8JrqUSMw2wqLPuHxVsJZ2Bg"
Agent: [Shows SOL balance and top token holdings with USD values]

User: "show me NFTs for this wallet"
Agent: [Displays NFT collections with floor prices]
```

### Trading Operations
```
User: "buy 0.01 SOL of BONK"
Agent: [Shows swap preview with price impact and fees]

User: "confirm swap"
Agent: [Executes swap and provides transaction hash]
```

## 🏆 Submission Details

This project was built for the **Nosana Builders Challenge** and includes:

- ✅ Custom AI agent with multiple tools
- ✅ Docker containerization
- ✅ Nosana network deployment
- ✅ Comprehensive documentation
- ✅ Video demonstration
- ✅ Production-ready code quality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [Nosana](https://nosana.io) for the infrastructure and challenge
- [Mastra](https://mastra.ai) for the AI framework
- [Jupiter Exchange](https://jup.ag) for DEX aggregation
- [Mayan Finance](https://mayan.finance) for cross-chain swaps
- [Pump.fun](https://pump.fun) for token launches

## 📞 Support

For questions or issues:
- Join [Nosana Discord](https://nosana.com/discord)
- Check [Mastra Documentation](https://mastra.ai/docs)
- Review [project issues](https://github.com/your-username/agent-challenge/issues)

---

**Built with ❤️ for the Nosana ecosystem**
