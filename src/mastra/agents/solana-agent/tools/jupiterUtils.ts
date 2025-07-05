import axios from "axios";

let cachedTokens: any[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getJupiterTokens() {
  const now = Date.now();
  if (cachedTokens.length && now - cacheTimestamp < CACHE_DURATION) {
    return cachedTokens;
  }
  const url = "https://tokens.jup.ag/tokens?tags=verified";
  const res = await axios.get(url);
  cachedTokens = res.data || [];
  cacheTimestamp = now;
  return cachedTokens;
}

export async function searchJupiterTokens(query: string) {
  const tokens = await getJupiterTokens();
  const searchTerm = query.trim().replace(/^\$/, "").toLowerCase();

  let results = tokens.filter(
    (token: any) =>
      (token.name && token.name.toLowerCase().includes(searchTerm)) ||
      (token.symbol && token.symbol.toLowerCase().includes(searchTerm)) ||
      (token.address && token.address.toLowerCase() === searchTerm)
  ).filter(
    (token: any) => token.name && token.symbol
  );

  results = results.sort((a: any, b: any) => {
    const aExact =
      (a.symbol && a.symbol.toLowerCase() === searchTerm) ||
      (a.name && a.name.toLowerCase() === searchTerm) ||
      (a.address && a.address.toLowerCase() === searchTerm);
    const bExact =
      (b.symbol && b.symbol.toLowerCase() === searchTerm) ||
      (b.name && b.name.toLowerCase() === searchTerm) ||
      (b.address && b.address.toLowerCase() === searchTerm);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });

  return results;
}