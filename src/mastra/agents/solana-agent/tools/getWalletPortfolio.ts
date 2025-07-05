import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

const HELIUS_RPC = process.env.HELIUS_RPC || "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY";
const JUPITER_TOKENS_URL = "https://token.jup.ag/all";
const JUPITER_PRICES_URL = "https://price.jup.ag/v4/price";
const SOL_MINT = "So11111111111111111111111111111111111111112";

export const getWalletPortfolio = createTool({
  id: "getWalletPortfolio",
  description: "Get a Solana wallet's SOL balance and top token holdings (by USD value), with live prices and metadata.",
  inputSchema: z.object({
    walletAddress: z.string().min(32).describe("Solana wallet address"),
  }),
  outputSchema: z.object({
    sol: z.object({
      lamports: z.number(),
      sol: z.number(),
      usd: z.number(),
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
      })
    ),
    text: z.string(),
  }),
  execute: async (args) => {
    const walletAddress =
      args?.input?.walletAddress ||
      args?.walletAddress ||
      args?.context?.walletAddress ||
      (typeof args === "string" ? args : null);

    if (!walletAddress) {
      throw new Error("walletAddress is required");
    }

    // 1. Fetch all assets (tokens + SOL) from Helius
    let items: any[] = [];
    let solLamports = 0;
    let solPrice = 0;
    let solUsd = 0;
    try {
      const heliusRes = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: "2.0",
          id: "1",
          method: "searchAssets",
          params: {
            ownerAddress: walletAddress,
            tokenType: "all",
            displayOptions: {
              showNativeBalance: true,
              showInscription: false,
              showCollectionMetadata: false,
            },
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
      items = heliusRes.data?.result?.items || [];
      solLamports = heliusRes.data?.result?.nativeBalance?.lamports || 0;
      solPrice = heliusRes.data?.result?.nativeBalance?.price_per_sol || 0;
      solUsd = heliusRes.data?.result?.nativeBalance?.total_price || 0;
    } catch (err: any) {
      return {
        sol: { lamports: 0, sol: 0, usd: 0 },
        tokens: [],
        text: "Error fetching wallet data: " + (err?.response?.data?.error || err.message || "Unknown error"),
      };
    }

    // 2. Parse fungible tokens (ignore NFTs)
    let tokens: any[] = items.filter(
      (item: any) =>
        item.interface === "FungibleToken" || item.interface === "FungibleAsset"
    );

    // 3. Add SOL as a "token" for unified processing
    tokens.push({
      id: SOL_MINT,
      token_info: {
        balance: solLamports,
        decimals: 9,
        price_info: {
          price_per_token: solPrice,
          total_price: solUsd,
        },
      },
      content: {
        metadata: {
          name: "Solana",
          symbol: "SOL",
        },
        links: {
          image:
            "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        },
      },
    });

    // 4. Fetch Jupiter token list and prices
    let tokenList: any[] = [];
    let priceMap: Record<string, any> = {};
    try {
      const [tokenListRes, priceRes] = await Promise.all([
        axios.get(JUPITER_TOKENS_URL),
        axios.get(
          `${JUPITER_PRICES_URL}?ids=${tokens
            .map((t) => t.id || t.mint)
            .join(",")}`
        ),
      ]);
      tokenList = tokenListRes.data || [];
      priceMap = priceRes.data?.data || {};
    } catch (err) {
      // fallback: no price enrichment
    }

    // 5. Enrich tokens with metadata and USD price
    const enrichedTokens = tokens
      .map((token) => {
        const mint = token.id || token.mint;
        const meta = tokenList.find((t) => t.address === mint) || {};
        const decimals =
          token.token_info?.decimals ??
          meta.decimals ??
          (mint === SOL_MINT ? 9 : 0);
        const rawAmount = token.token_info?.balance || token.token_info?.amount || "0";
        const uiAmount =
          typeof rawAmount === "string" || typeof rawAmount === "number"
            ? Number(rawAmount) / Math.pow(10, decimals)
            : 0;
        const price =
          priceMap[mint]?.price ||
          token.token_info?.price_info?.price_per_token ||
          0;
        const usd = uiAmount * price;
        return {
          mint,
          amount: rawAmount.toString(),
          decimals,
          uiAmount,
          tokenName: meta.name || token.content?.metadata?.name,
          tokenSymbol: meta.symbol || token.content?.metadata?.symbol,
          logo: meta.logoURI || token.content?.links?.image,
          usd,
        };
      })
      .filter((t) => t.usd > 0.01) // ignore dust
      .sort((a, b) => b.usd - a.usd);

    // 6. Separate SOL and top tokens (dynamic count)
    const solToken = enrichedTokens.find((t) => t.mint === SOL_MINT) || {
      mint: SOL_MINT,
      amount: solLamports.toString(),
      decimals: 9,
      uiAmount: solLamports / 1e9,
      tokenName: "Solana",
      tokenSymbol: "SOL",
      logo:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      usd: solUsd,
    };
    const topTokens = enrichedTokens
      .filter((t) => t.mint !== SOL_MINT)
      .slice(0, 10);

    // 7. Human-friendly, attractive Markdown summary
    const totalUsd = solToken.usd + topTokens.reduce((sum, t) => sum + t.usd, 0);

    let text = `Here is the summary of wallet \`${walletAddress}\`:\n\n`;
    
text += `💰 **Wallet Portfolio Summary**\n\n`;
text += `The current portfolio value of the wallet is **$${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}**.\n\n`;
text += `🌞 **SOL Balance:** ${solToken.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 9 })} SOL ($${solToken.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })})\n\n`;
    
    if (topTokens.length > 0) {
      text += `Here are the top holdings:\n\n`;
      text += `| # | Token | Symbol | Amount | Value (USD) |\n`;
      text += `|---|-------|--------|--------|-------------|\n`;
      topTokens.forEach((token, idx) => {
        text += `| ${idx + 1} | ${token.tokenName || token.tokenSymbol || token.mint} | ${token.tokenSymbol || ""} | ${token.uiAmount} | $${token.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })} |\n`;
      });
      text += `\nThe wallet holds a total of ${topTokens.length} token${topTokens.length > 1 ? "s" : ""}.\n`;
      text += `\nFor more detailed information about these tokens, including their current market value in USD and the token's logo, please refer to the \`searchToken\` tool.`;
    } else {
      text += "No nonzero token holdings found.";
    }

    return {
      sol: {
        lamports: solToken.amount ? Number(solToken.amount) : 0,
        sol: solToken.uiAmount,
        usd: solToken.usd,
      },
      tokens: topTokens,
      text,
    };
  },
});