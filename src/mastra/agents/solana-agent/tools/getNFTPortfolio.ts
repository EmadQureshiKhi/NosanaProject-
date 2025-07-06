import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

const HELIUS_RPC = process.env.HELIUS_RPC || "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY";

interface CollectionStats {
  floorPrice?: number;
  listedCount?: number;
  avgPrice24hr?: number;
  volumeAll?: number;
}

interface MagicEdenTokenResponse {
  collection?: string;
  collectionName?: string;
}

// Helper function to extract wallet address from various input formats
function extractWalletAddress(args: any): string | null {
  // Direct wallet address properties
  let walletAddress =
    args?.input?.walletAddress ||
    args?.walletAddress ||
    args?.context?.walletAddress ||
    null;

  // If args is a string, use it directly
  if (typeof args === "string") {
    walletAddress = args;
  }

  // Search for wallet address in input text/string
  if (!walletAddress && args?.input) {
    const inputStr = typeof args.input === "string" ? args.input : JSON.stringify(args.input);
    // Solana wallet addresses are 32-44 characters, base58 encoded
    const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    const matches = inputStr.match(solanaAddressRegex);

    if (matches) {
      // Take the longest match (most likely to be a complete address)
      walletAddress = matches.reduce((longest, current) =>
        current.length > longest.length ? current : longest, ""
      );
    }
  }

  // Clean up the wallet address
  if (walletAddress && typeof walletAddress === "string") {
    walletAddress = walletAddress.replace(/['"]/g, "").trim();
    // Validate length (Solana addresses are typically 32-44 characters)
    if (walletAddress.length >= 32 && walletAddress.length <= 44) {
      return walletAddress;
    }
  }

  return null;
}

// Get Magic Eden collection slug from NFT mint
async function getMagicEdenCollectionSlug(nftMint: string): Promise<string | null> {
  try {
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${nftMint}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NFT-Portfolio-Tool/1.0)',
      }
    });
    
    return response.data?.collection || null;
  } catch (error) {
    console.log(`Failed to get collection slug for ${nftMint}:`, error.message);
    return null;
  }
}

// Get collection stats from Magic Eden using collection slug
async function getCollectionStatsFromSlug(collectionSlug: string): Promise<CollectionStats> {
  try {
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${collectionSlug}/stats`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NFT-Portfolio-Tool/1.0)',
      }
    });
    
    if (response.data?.floorPrice) {
      return {
        floorPrice: response.data.floorPrice / 1e9, // Convert lamports to SOL
        listedCount: response.data.listedCount,
        avgPrice24hr: response.data.avgPrice24hr ? response.data.avgPrice24hr / 1e9 : undefined,
        volumeAll: response.data.volumeAll ? response.data.volumeAll / 1e9 : undefined,
      };
    }
  } catch (error) {
    console.log(`Failed to get stats for collection ${collectionSlug}:`, error.message);
  }

  return {};
}

export const getNFTPortfolio = createTool({
  id: "getNFTPortfolio",
  description: "Get a Solana wallet's NFT collection with floor prices and collection stats. Shows only regular NFTs (no cNFTs or SPL tokens).",
  inputSchema: z.object({
    walletAddress: z.string().min(32).describe("Solana wallet address"),
  }),
  outputSchema: z.object({
    collections: z.array(
      z.object({
        name: z.string(),
        symbol: z.string().optional(),
        count: z.number(),
        floorPrice: z.number().optional(),
        estimatedValue: z.number().optional(),
        listedCount: z.number().optional(),
        nfts: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            symbol: z.string().optional(),
            description: z.string().optional(),
            image: z.string().optional(),
            externalUrl: z.string().optional(),
          })
        ),
      })
    ),
    totalNFTs: z.number(),
    totalCollections: z.number(),
    estimatedPortfolioValue: z.number(),
    text: z.string(),
  }),
  execute: async (args) => {
    // Use the robust wallet extraction helper
    const walletAddress = extractWalletAddress(args);

    if (!walletAddress) {
      throw new Error("walletAddress is required and must be a valid Solana address (32-44 characters)");
    }

    try {
      // Fetch only NFTs (exclude compressed NFTs and SPL tokens)
      const heliusRes = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: "2.0",
          id: "1",
          method: "searchAssets",
          params: {
            ownerAddress: walletAddress,
            tokenType: "nonFungible", // Only NFTs, no SPL tokens
            displayOptions: {
              showNativeBalance: false,
              showInscription: false,
              showCollectionMetadata: true,
            },
          },
        },
        { 
          headers: { "Content-Type": "application/json" },
          timeout: 30000, // 30 second timeout
        }
      );

      const items = heliusRes.data?.result?.items || [];

      // Filter out compressed NFTs (cNFTs) - keep only regular NFTs
      const regularNFTs = items.filter((item: any) => {
        // Only include V1_NFT and ProgrammableNFT interfaces
        const isValidInterface = item.interface === "V1_NFT" || item.interface === "ProgrammableNFT";
        
        // Exclude compressed NFTs
        const isNotCompressed = !item.compression?.compressed;
        
        return isValidInterface && isNotCompressed;
      });

      console.log(`Found ${regularNFTs.length} regular NFTs out of ${items.length} total items`);

      // Process NFTs with essential data only
      const processedNFTs = regularNFTs.map((nft: any) => {
        const metadata = nft.content?.metadata || {};
        const links = nft.content?.links || {};
        const collectionInfo = nft.grouping?.[0] || {};
        
        return {
          id: nft.id,
          name: metadata.name || "Unnamed NFT",
          symbol: metadata.symbol || "",
          description: metadata.description || "",
          image: links.image || "",
          externalUrl: links.external_url || "",
          collectionName: collectionInfo.collection_metadata?.name || "Uncategorized",
          collectionSymbol: collectionInfo.collection_metadata?.symbol || "",
        };
      });

      // Group by collection name (not symbol, as that can be empty)
      const collectionMap = new Map();
      processedNFTs.forEach(nft => {
        const key = nft.collectionName;
        if (!collectionMap.has(key)) {
          collectionMap.set(key, {
            name: nft.collectionName,
            symbol: nft.collectionSymbol,
            nfts: [],
            collectionSlug: null, // Will be populated later
          });
        }
        collectionMap.get(key).nfts.push({
          id: nft.id,
          name: nft.name,
          symbol: nft.symbol,
          description: nft.description,
          image: nft.image,
          externalUrl: nft.externalUrl,
        });
      });

      console.log(`Grouped into ${collectionMap.size} collections`);

      // For each collection, get the Magic Eden collection slug from the first NFT
      const collections = [];
      let totalEstimatedValue = 0;

      for (const [collectionName, collectionData] of collectionMap) {
        const count = collectionData.nfts.length;
        let stats: CollectionStats = {};
        
        // Get Magic Eden collection slug from the first NFT in this collection
        if (collectionData.nfts.length > 0) {
          const firstNftMint = collectionData.nfts[0].id;
          console.log(`Getting collection slug for ${collectionName} using NFT ${firstNftMint}`);
          
          const collectionSlug = await getMagicEdenCollectionSlug(firstNftMint);
          
          if (collectionSlug) {
            console.log(`Found collection slug: ${collectionSlug}`);
            stats = await getCollectionStatsFromSlug(collectionSlug);
          } else {
            console.log(`No collection slug found for ${collectionName}`);
          }
        }

        const floorPrice = stats.floorPrice;
        const estimatedValue = floorPrice ? floorPrice * count : 0;
        
        if (estimatedValue > 0) {
          totalEstimatedValue += estimatedValue;
        }

        collections.push({
          name: collectionName,
          symbol: collectionData.symbol,
          count,
          floorPrice,
          estimatedValue: estimatedValue > 0 ? estimatedValue : undefined,
          listedCount: stats.listedCount,
          nfts: collectionData.nfts.slice(0, 5), // Limit to 5 NFTs per collection for display
        });
      }

      // Sort collections by estimated value (highest first), then by count
      collections.sort((a, b) => {
        const aValue = a.estimatedValue || 0;
        const bValue = b.estimatedValue || 0;
        if (aValue !== bValue) return bValue - aValue;
        return b.count - a.count;
      });

      // FIXED: Use correct counts
      const totalNFTs = regularNFTs.length;
      const totalCollections = collections.length;

      // Create summary text
      let text = `Here is the NFT portfolio for wallet \`${walletAddress}\`:\n\n`;
      
      if (collections.length === 0) {
        text += "🎨 **No regular NFTs found in this wallet.**\n\n";
        text += "This wallet either has no NFTs, or only contains compressed NFTs (cNFTs) which are typically spam/airdrops.";
      } else {
        text += `🎨 **NFT Portfolio Summary**\n\n`;
        text += `**Total Collections:** ${totalCollections}\n`;
        text += `**Total NFTs:** ${totalNFTs}\n`;
        if (totalEstimatedValue > 0) {
          text += `**Estimated Portfolio Value:** ${totalEstimatedValue.toFixed(2)} SOL\n`;
        }
        text += `\n---\n\n`;

        collections.forEach((collection, index) => {
          text += `### ${index + 1}. 📁 ${collection.name}\n`;
          text += `**Count:** ${collection.count} NFT${collection.count > 1 ? 's' : ''}\n`;
          
          if (collection.floorPrice) {
            text += `**Floor Price:** ${collection.floorPrice.toFixed(3)} SOL\n`;
          } else {
            text += `**Floor Price:** Not available\n`;
          }
          
          if (collection.estimatedValue) {
            text += `**Estimated Value:** ${collection.estimatedValue.toFixed(2)} SOL\n`;
          }
          
          if (collection.listedCount !== undefined) {
            text += `**Listed:** ${collection.listedCount} items\n`;
          }

          // Show sample NFTs
          text += `\n**Sample NFTs:**\n`;
          collection.nfts.slice(0, 3).forEach((nft, nftIndex) => {
            text += `${nftIndex + 1}. **${nft.name}**\n`;
            if (nft.description && nft.description.length < 80) {
              text += `   *${nft.description}*\n`;
            }
            text += `   ID: \`${nft.id}\`\n`;
          });

          if (collection.nfts.length > 3) {
            text += `   *...and ${collection.nfts.length - 3} more*\n`;
          }

          text += `\n`;
        });

        text += `\n💡 **Note:** Floor prices are fetched from Magic Eden using the proper token→collection→stats flow. Values are estimates based on current floor prices.`;
      }

      return {
        collections,
        totalNFTs,
        totalCollections,
        estimatedPortfolioValue: totalEstimatedValue,
        text,
      };

    } catch (error: any) {
      return {
        collections: [],
        totalNFTs: 0,
        totalCollections: 0,
        estimatedPortfolioValue: 0,
        text: `Error fetching NFT portfolio: ${error?.response?.data?.error || error.message || "Unable to fetch NFT data"}`,
      };
    }
  },
});