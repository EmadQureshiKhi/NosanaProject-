import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

const HELIUS_RPC = process.env.HELIUS_RPC || "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY";
const TRENCH_API_BASE = "https://trench.bot/api/bundle/bundle_advanced";

// Type definitions based on your reference code
interface BundleAnalysisResponse {
  bonded: boolean;
  bundles: Record<string, BundleDetails>;
  creator_analysis: CreatorAnalysis;
  distributed_amount: number;
  distributed_percentage: number;
  distributed_wallets: number;
  ticker: string;
  total_bundles: number;
  total_holding_amount: number;
  total_holding_percentage: number;
  total_percentage_bundled: number;
  total_sol_spent: number;
  total_tokens_bundled: number;
}

interface BundleDetails {
  bundle_analysis: BundleAnalysis;
  funding_analysis?: FundingAnalysis;
  holding_amount: number;
  holding_percentage: number;
  slot?: number;
  token_percentage: number;
  total_sol: number;
  total_tokens: number;
  unique_wallets: number;
  wallet_categories: Record<string, string>;
  wallet_info: Record<string, WalletInfo>;
}

interface BundleAnalysis {
  category_breakdown: Record<string, number>;
  copytrading_groups: Record<string, string>;
  is_likely_bundle: boolean;
  primary_category: string;
}

interface FundingAnalysis {
  cex_funded_percentage?: number;
  funding_trust_score?: number;
  mixer_funded_percentage?: number;
}

interface WalletInfo {
  sol: number;
  sol_percentage: number;
  token_percentage: number;
  tokens: number;
}

interface CreatorAnalysis {
  address: string;
  current_holdings: number;
  history: CreatorHistory;
  holding_percentage: number;
  risk_level: string;
  warning_flags: (string | null)[];
}

interface CreatorHistory {
  average_market_cap: number;
  high_risk: boolean;
  previous_coins: PreviousCoin[];
  recent_rugs: number;
  rug_count: number;
  rug_percentage: number;
  total_coins_created: number;
}

interface PreviousCoin {
  created_at: number;
  is_rug: boolean;
  market_cap: number;
  mint: string;
  symbol: string;
}

// Helper function to get mint account info for decimals
async function getMintAccountInfo(mintAddress: string) {
  try {
    const response = await axios.post(
      HELIUS_RPC,
      {
        jsonrpc: "2.0",
        id: "1",
        method: "getAccountInfo",
        params: [
          mintAddress,
          {
            encoding: "jsonParsed",
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const accountInfo = response.data?.result?.value?.data?.parsed?.info;
    return {
      decimals: accountInfo?.decimals || 9,
      supply: accountInfo?.supply || "0",
    };
  } catch (error) {
    return { decimals: 9, supply: "0" };
  }
}

// Helper function to adjust token values based on decimals
function mapTokenDecimals(data: BundleAnalysisResponse, decimals: number): void {
  const tokenKeys = [
    'total_tokens',
    'tokens',
    'total_tokens_bundled',
    'distributed_amount',
    'holding_amount',
    'total_holding_amount',
  ];

  function adjustValue(value: any): any {
    return typeof value === 'number' ? value / Math.pow(10, decimals) : value;
  }

  function traverse(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key of Object.keys(obj)) {
      if (tokenKeys.includes(key) && typeof obj[key] === 'number') {
        obj[key] = adjustValue(obj[key]);
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }

  traverse(data);
}

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

// Helper function to shorten wallet address
function shortenAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export const bundleChecker = createTool({
  id: "bundleChecker",
  description: "Check if a Solana token (pump.fun launches) is bundled by analyzing wallet clusters and sniper activity. Provides comprehensive bundle analysis with individual bundle details.",
  inputSchema: z.object({
    mintAddress: z.string().min(32).describe("Solana token mint address to analyze for bundles"),
  }),
  outputSchema: z.object({
    isBundled: z.boolean(),
    ticker: z.string(),
    totalBundles: z.number(),
    totalPercentageBundled: z.number(),
    totalHoldingPercentage: z.number(),
    totalHoldingAmount: z.number(),
    bonded: z.boolean(),
    creatorRiskLevel: z.string(),
    rugCount: z.number(),
    summary: z.string(),
  }),
  execute: async (args) => {
    const mintAddress =
      args?.input?.mintAddress ||
      args?.mintAddress ||
      args?.context?.mintAddress ||
      (typeof args === "string" ? args : null);

    if (!mintAddress) {
      throw new Error("mintAddress is required");
    }

    try {
      // Fetch bundle analysis from TrenchBot API
      const response = await axios.get(`${TRENCH_API_BASE}/${mintAddress}`);
      
      if (!response.data) {
        return {
          isBundled: false,
          ticker: "Unknown",
          totalBundles: 0,
          totalPercentageBundled: 0,
          totalHoldingPercentage: 0,
          totalHoldingAmount: 0,
          bonded: false,
          creatorRiskLevel: "Unknown",
          rugCount: 0,
          summary: "Unable to fetch bundle data. Please make sure this is a pump.fun token.",
        };
      }

      const analysis: BundleAnalysisResponse = response.data;

      // Get mint info for decimal adjustment
      const mintInfo = await getMintAccountInfo(mintAddress);
      
      // Apply decimal adjustments
      mapTokenDecimals(analysis, mintInfo.decimals);

      // Determine if token is bundled
      const isBundled = analysis.total_bundles > 0 && analysis.total_percentage_bundled > 0;

      // Build detailed summary
      let summary = `# 🔍 Bundle Analysis: ${analysis.ticker?.toUpperCase() || 'Token'}\n\n`;
      
      // Main summary box
      summary += `## 📊 **Bundle Detection Summary**\n\n`;
      summary += `| Metric | Value |\n`;
      summary += `|--------|-------|\n`;
      summary += `| **Bundle Status** | ${isBundled ? '🚨 **BUNDLED**' : '✅ **Clean**'} |\n`;
      summary += `| **Ticker** | ${analysis.ticker || 'N/A'} |\n`;
      summary += `| **Total Bundles** | ${analysis.total_bundles || 0} |\n`;
      summary += `| **Total SOL Spent** | ${analysis.total_sol_spent?.toFixed(2) || 0} SOL |\n`;
      summary += `| **Bundled Total** | ${analysis.total_percentage_bundled?.toFixed(2) || 0}% |\n`;
      summary += `| **Held Percentage** | ${analysis.total_holding_percentage?.toFixed(2) || 0}% |\n`;
      summary += `| **Held Tokens** | ${analysis.total_holding_amount ? formatNumber(analysis.total_holding_amount) : 'N/A'} |\n`;
      summary += `| **Bonded** | ${analysis.bonded ? 'Yes' : 'No'} |\n`;
      summary += `| **Source** | [TrenchRadar](https://trench.bot/bundles/${mintAddress}?all=true) |\n\n`;

      // Creator analysis
      if (analysis.creator_analysis) {
        const creator = analysis.creator_analysis;
        summary += `## 👤 **Creator Analysis**\n\n`;
        summary += `| Metric | Value |\n`;
        summary += `|--------|-------|\n`;
        summary += `| **Creator Address** | \`${creator.address}\` |\n`;
        summary += `| **Risk Level** | ${creator.risk_level || 'Unknown'} |\n`;
        summary += `| **Current Holdings** | ${creator.current_holdings || 0} tokens |\n`;
        
        if (creator.history) {
          summary += `| **Previous Coins Created** | ${creator.history.total_coins_created || 0} |\n`;
          summary += `| **Rug History** | ${creator.history.rug_count || 0} rugs |\n`;
          summary += `| **Current Holdings** | ${creator.holding_percentage?.toFixed(2) || 0}% |\n`;
        }
        summary += `\n`;
      }

      // Individual bundle details (sorted by SOL spent, limited to 25)
      if (analysis.bundles && Object.keys(analysis.bundles).length > 0) {
        const bundleEntries = Object.entries(analysis.bundles)
          .sort(([,a], [,b]) => (b.total_sol || 0) - (a.total_sol || 0))
          .slice(0, 25); // Limit to 25 bundles

        summary += `## 🎯 **Individual Bundle Analysis**\n\n`;
        summary += `Found **${bundleEntries.length}** bundle${bundleEntries.length > 1 ? 's' : ''} (showing top ${Math.min(bundleEntries.length, 25)}):\n\n`;

        bundleEntries.forEach(([bundleId, bundle], index) => {
          summary += `### **Bundle ${index + 1}**\n\n`;
          
          // Bundle metrics
          summary += `| Metric | Value |\n`;
          summary += `|--------|-------|\n`;
          summary += `| **Unique Wallets** | ${bundle.unique_wallets} |\n`;
          summary += `| **Total Tokens Bought** | ${formatNumber(bundle.total_tokens)} |\n`;
          summary += `| **Total SOL Spent** | ${bundle.total_sol?.toFixed(2)} SOL |\n`;
          summary += `| **Token Percentage** | ${bundle.token_percentage?.toFixed(2)}% |\n`;
          summary += `| **Holding Percentage** | ${bundle.holding_percentage?.toFixed(2)}% |\n`;
          summary += `| **Holding Amount** | ${formatNumber(bundle.holding_amount)} |\n`;
          
          if (bundle.slot) {
            summary += `| **Slot** | ${bundle.slot} |\n`;
          }
          summary += `\n`;

          // Bundle Analysis
          if (bundle.bundle_analysis) {
            summary += `**Bundle Analysis:**\n`;
            summary += `- **Primary Category:** ${bundle.bundle_analysis.primary_category || 'N/A'}\n`;
            summary += `- **Likely Team Bundle:** ${bundle.bundle_analysis.is_likely_bundle ? 'Yes' : 'No'}\n\n`;
          }

          // Funding Analysis (compact format)
          if (bundle.funding_analysis) {
            const funding = bundle.funding_analysis;
            summary += `**Funding Analysis:** `;
            summary += `Trust Score: ${funding.funding_trust_score || 'N/A'}/100, `;
            summary += `CEX: ${funding.cex_funded_percentage?.toFixed(2) || '0.00'}%, `;
            summary += `Mixer: ${funding.mixer_funded_percentage?.toFixed(2) || '0.00'}%\n\n`;
          }

          // Wallet Information
          if (bundle.wallet_info && Object.keys(bundle.wallet_info).length > 0) {
            summary += `**Wallet Information:**\n\n`;
            
            // Sort wallets by SOL spent (descending)
            const sortedWallets = Object.entries(bundle.wallet_info)
              .sort(([,a], [,b]) => (b.sol || 0) - (a.sol || 0));

            sortedWallets.forEach(([walletAddress, walletData]) => {
              const shortAddress = shortenAddress(walletAddress);
              summary += `**${shortAddress}** [📊](https://solscan.io/account/${walletAddress})\n`;
              summary += `- **Tokens Bought:** ${formatNumber(walletData.tokens)} (${walletData.token_percentage?.toFixed(2)}%)\n`;
              summary += `- **SOL Spent:** ${walletData.sol?.toFixed(2)} SOL (${walletData.sol_percentage?.toFixed(2)}%)\n\n`;
            });
          }

          summary += `---\n\n`;
        });
      }

      // Distribution info
      if (analysis.distributed_wallets > 0) {
        summary += `## 📈 **Distribution Statistics**\n\n`;
        summary += `- **Distributed Amount:** ${formatNumber(analysis.distributed_amount)} tokens (${analysis.distributed_percentage?.toFixed(2)}% of supply)\n`;
        summary += `- **Distributed to:** ${analysis.distributed_wallets} wallets\n`;
        summary += `- **Current Holdings in Bundles:** ${formatNumber(analysis.total_holding_amount)} tokens (${analysis.total_holding_percentage?.toFixed(2)}% of supply)\n\n`;
      }

      // Bundle Characteristics
      if (analysis.bundles && Object.keys(analysis.bundles).length > 0) {
        summary += `## 🔍 **Bundle Characteristics**\n\n`;
        const bundles = Object.values(analysis.bundles);
        const avgWallets = bundles.reduce((sum, b) => sum + (b.unique_wallets || 0), 0) / bundles.length;
        const totalWallets = bundles.reduce((sum, b) => sum + (b.unique_wallets || 0), 0);
        
        summary += `- **Most bundles are characterized by:** "${bundles[0]?.bundle_analysis?.primary_category || 'new wallet'}" categories\n`;
        summary += `- **Bundle sizes vary from:** 2-${Math.max(...bundles.map(b => b.unique_wallets || 0))} wallets per bundle\n`;
        summary += `- **Individual bundle percentages range from:** ~${Math.min(...bundles.map(b => b.token_percentage || 0)).toFixed(2)}% to ~${Math.max(...bundles.map(b => b.token_percentage || 0)).toFixed(2)}% of total supply\n\n`;
      }

      // Final assessment
      summary += `## 🎯 **Final Assessment**\n\n`;
      if (isBundled) {
        summary += `⚠️ **This token shows clear signs of coordinated buying through multiple bundles, with over ${analysis.total_percentage_bundled?.toFixed(2)}% of the tokens being involved in bundle transactions.** `;
        
        if (analysis.creator_analysis?.history?.rug_count > 0) {
          summary += `While the creator's history shows low risk, the high percentage of bundled tokens suggests potential price manipulation risk. `;
        }
        
        summary += `Users should exercise caution when trading this token.\n\n`;
      } else {
        summary += `✅ **Good News:** No significant bundling activity detected for this token.\n\n`;
      }

      summary += `**Mint Address:** \`${mintAddress}\`\n`;
      summary += `**Analysis Source:** [TrenchRadar Bundle Analysis](https://trench.bot/bundles/${mintAddress}?all=true)`;

      return {
        isBundled,
        ticker: analysis.ticker || "Unknown",
        totalBundles: analysis.total_bundles || 0,
        totalPercentageBundled: analysis.total_percentage_bundled || 0,
        totalHoldingPercentage: analysis.total_holding_percentage || 0,
        totalHoldingAmount: analysis.total_holding_amount || 0,
        bonded: analysis.bonded || false,
        creatorRiskLevel: analysis.creator_analysis?.risk_level || "Unknown",
        rugCount: analysis.creator_analysis?.history?.rug_count || 0,
        summary,
      };

    } catch (error: any) {
      return {
        isBundled: false,
        ticker: "Unknown",
        totalBundles: 0,
        totalPercentageBundled: 0,
        totalHoldingPercentage: 0,
        totalHoldingAmount: 0,
        bonded: false,
        creatorRiskLevel: "Unknown",
        rugCount: 0,
        summary: `Error analyzing bundles: ${error?.response?.data?.error || error.message || "Unable to fetch bundle data. Please make sure this is a pump.fun token."}`,
  };
    }
  },
});
