import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { searchToken } from "../agents/solana-agent/tools/searchToken";
import { tokenInfo } from "../agents/solana-agent/tools/tokenInfo";
import { getWalletPortfolio } from "../agents/solana-agent/tools/getWalletPortfolio";
import { bundleChecker } from "../agents/solana-agent/tools/bundleChecker";
import { getNFTPortfolio } from "../agents/solana-agent/tools/getNFTPortfolio";

// Step 1: Get wallet portfolio
const getPortfolioStep = createStep({
  id: "get-portfolio",
  description: "Get wallet's SOL balance and token holdings",
  inputSchema: z.object({
    walletAddress: z.string().min(32).describe("Solana wallet address"),
  }),
  outputSchema: z.object({
    sol: z.object({
      lamports: z.number(),
      sol: z.number(),
      usd: z.number(),
      breakdown: z.object({
        nativeSOL: z.number(),
        wrappedSOL: z.number(),
      }),
    }),
    tokens: z.array(
      z.object({
        mint: z.string(),
        amount: z.string(),
        decimals: z.number(),
        uiAmount: z.number(),
        tokenName: z.string().optional(),
        tokenSymbol: z.string().optional(),
        logo: z.string().optional(),
        usd: z.number(),
        priceValidated: z.boolean(),
      })
    ),
    text: z.string(),
  }),
  execute: async ({ inputData }) => {
    const result = await getWalletPortfolio.execute({
      context: { walletAddress: inputData.walletAddress }
    });
    return result;
  },
});

// Step 2: Analyze top tokens for bundle activity
const analyzeBundlesStep = createStep({
  id: "analyze-bundles",
  description: "Check top tokens for bundle activity",
  inputSchema: z.object({
    tokens: z.array(
      z.object({
        mint: z.string(),
        tokenSymbol: z.string().optional(),
        usd: z.number(),
      })
    ),
  }),
  outputSchema: z.object({
    bundleAnalysis: z.array(
      z.object({
        mint: z.string(),
        symbol: z.string(),
        usdValue: z.number(),
        isBundled: z.boolean(),
        bundleCount: z.number(),
        riskLevel: z.string(),
      })
    ),
    summary: z.string(),
  }),
  execute: async ({ inputData }) => {
    const bundleAnalysis = [];
    let summary = "Bundle Analysis Summary:\n\n";
    
    // Analyze top 3 tokens only to avoid rate limits
    const topTokens = inputData.tokens.slice(0, 3);
    
    for (const token of topTokens) {
      try {
        const result = await bundleChecker.execute({
          context: { mintAddress: token.mint }
        });
        
        bundleAnalysis.push({
          mint: token.mint,
          symbol: token.tokenSymbol || "Unknown",
          usdValue: token.usd,
          isBundled: result.isBundled,
          bundleCount: result.totalBundles,
          riskLevel: result.creatorRiskLevel,
        });
        
        summary += `${token.tokenSymbol || "Unknown"}: ${result.isBundled ? "🚨 BUNDLED" : "✅ Clean"} (${result.totalBundles} bundles)\n`;
      } catch (error) {
        bundleAnalysis.push({
          mint: token.mint,
          symbol: token.tokenSymbol || "Unknown",
          usdValue: token.usd,
          isBundled: false,
          bundleCount: 0,
          riskLevel: "Unknown",
        });
        summary += `${token.tokenSymbol || "Unknown"}: ❌ Analysis failed\n`;
      }
    }
    
    return { bundleAnalysis, summary };
  },
});

// Step 3: Get NFT portfolio
const getNFTsStep = createStep({
  id: "get-nfts",
  description: "Get wallet's NFT collection",
  inputSchema: z.object({
    walletAddress: z.string(),
  }),
  outputSchema: z.object({
    collections: z.array(z.any()),
    totalNFTs: z.number(),
    totalCollections: z.number(),
    estimatedPortfolioValue: z.number(),
    text: z.string(),
  }),
  execute: async ({ inputData }) => {
    const result = await getNFTPortfolio.execute({
      context: { walletAddress: inputData.walletAddress }
    });
    return result;
  },
});

// Step 4: Generate comprehensive report
const generateReportStep = createStep({
  id: "generate-report",
  description: "Generate comprehensive portfolio analysis report",
  inputSchema: z.object({
    walletAddress: z.string(),
    portfolioData: z.object({
      sol: z.object({
        sol: z.number(),
        usd: z.number(),
      }),
      tokens: z.array(z.any()),
    }),
    bundleData: z.object({
      bundleAnalysis: z.array(z.any()),
      summary: z.string(),
    }),
    nftData: z.object({
      totalNFTs: z.number(),
      totalCollections: z.number(),
      estimatedPortfolioValue: z.number(),
    }),
  }),
  outputSchema: z.object({
    report: z.string(),
    riskScore: z.number(),
    recommendations: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { walletAddress, portfolioData, bundleData, nftData } = inputData;
    
    // Calculate risk score based on bundle analysis
    const bundledTokens = bundleData.bundleAnalysis.filter(t => t.isBundled);
    const riskScore = Math.min(100, bundledTokens.length * 25);
    
    // Generate recommendations
    const recommendations = [];
    if (bundledTokens.length > 0) {
      recommendations.push("⚠️ Consider reviewing bundled tokens for potential risks");
    }
    if (portfolioData.sol.usd > 1000) {
      recommendations.push("💰 Consider diversifying large SOL holdings");
    }
    if (nftData.totalNFTs > 50) {
      recommendations.push("🎨 Large NFT collection - consider floor price monitoring");
    }
    if (recommendations.length === 0) {
      recommendations.push("✅ Portfolio looks healthy - continue monitoring");
    }
    
    const report = `
# 📊 Comprehensive Portfolio Analysis

**Wallet:** \`${walletAddress}\`

## 💰 Token Holdings
- **SOL Balance:** ${portfolioData.sol.sol.toFixed(4)} SOL ($${portfolioData.sol.usd.toFixed(2)})
- **Token Count:** ${portfolioData.tokens.length} tokens
- **Total Portfolio Value:** $${(portfolioData.sol.usd + portfolioData.tokens.reduce((sum, t) => sum + t.usd, 0)).toFixed(2)}

## 🚨 Risk Analysis
- **Risk Score:** ${riskScore}/100
- **Bundled Tokens:** ${bundledTokens.length}/${bundleData.bundleAnalysis.length} analyzed

${bundleData.summary}

## 🎨 NFT Collection
- **Total NFTs:** ${nftData.totalNFTs}
- **Collections:** ${nftData.totalCollections}
- **Estimated NFT Value:** ${nftData.estimatedPortfolioValue.toFixed(2)} SOL

## 📋 Recommendations
${recommendations.map(r => `- ${r}`).join('\n')}

---
*Analysis completed at ${new Date().toISOString()}*
    `.trim();
    
    return { report, riskScore, recommendations };
  },
});

// Main workflow
export const solanaPortfolioAnalysis = createWorkflow({
  id: "solana-portfolio-analysis",
  description: "Comprehensive Solana wallet portfolio analysis with risk assessment",
  inputSchema: z.object({
    walletAddress: z.string().min(32).describe("Solana wallet address to analyze"),
  }),
  outputSchema: z.object({
    report: z.string(),
    riskScore: z.number(),
    recommendations: z.array(z.string()),
    portfolioData: z.object({
      sol: z.object({
        sol: z.number(),
        usd: z.number(),
      }),
      tokens: z.array(z.any()),
    }),
    bundleData: z.object({
      bundleAnalysis: z.array(z.any()),
      summary: z.string(),
    }),
    nftData: z.object({
      totalNFTs: z.number(),
      totalCollections: z.number(),
      estimatedPortfolioValue: z.number(),
    }),
  }),
})
  .then(getPortfolioStep)
  .then(
    createStep({
      id: "prepare-bundle-analysis",
      description: "Prepare data for bundle analysis",
      inputSchema: z.object({
        tokens: z.array(z.any()),
      }),
      outputSchema: z.object({
        tokens: z.array(z.any()),
      }),
      execute: async ({ inputData }) => {
        return { tokens: inputData.tokens };
      },
    })
  )
  .parallel([
    analyzeBundlesStep,
    createStep({
      id: "get-nfts-parallel",
      description: "Get NFT portfolio in parallel",
      inputSchema: z.object({
        tokens: z.array(z.any()),
      }),
      outputSchema: z.object({
        collections: z.array(z.any()),
        totalNFTs: z.number(),
        totalCollections: z.number(),
        estimatedPortfolioValue: z.number(),
        text: z.string(),
      }),
      execute: async ({ inputData, workflowContext }) => {
        const walletAddress = workflowContext.inputData.walletAddress;
        const result = await getNFTPortfolio.execute({
          context: { walletAddress }
        });
        return result;
      },
    })
  ])
  .then(
    createStep({
      id: "combine-results",
      description: "Combine all analysis results",
      inputSchema: z.object({
        bundleAnalysis: z.array(z.any()),
        summary: z.string(),
        collections: z.array(z.any()),
        totalNFTs: z.number(),
        totalCollections: z.number(),
        estimatedPortfolioValue: z.number(),
        text: z.string(),
      }),
      outputSchema: z.object({
        walletAddress: z.string(),
        portfolioData: z.object({
          sol: z.object({
            sol: z.number(),
            usd: z.number(),
          }),
          tokens: z.array(z.any()),
        }),
        bundleData: z.object({
          bundleAnalysis: z.array(z.any()),
          summary: z.string(),
        }),
        nftData: z.object({
          totalNFTs: z.number(),
          totalCollections: z.number(),
          estimatedPortfolioValue: z.number(),
        }),
      }),
      execute: async ({ inputData, workflowContext }) => {
        const portfolioResult = workflowContext.steps["get-portfolio"].result;
        
        return {
          walletAddress: workflowContext.inputData.walletAddress,
          portfolioData: {
            sol: portfolioResult.sol,
            tokens: portfolioResult.tokens,
          },
          bundleData: {
            bundleAnalysis: inputData.bundleAnalysis,
            summary: inputData.summary,
          },
          nftData: {
            totalNFTs: inputData.totalNFTs,
            totalCollections: inputData.totalCollections,
            estimatedPortfolioValue: inputData.estimatedPortfolioValue,
          },
        };
      },
    })
  )
  .then(generateReportStep)
  .commit();