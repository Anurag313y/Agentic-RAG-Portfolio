import { useQuery } from "@tanstack/react-query";

import { getPortfolioContent } from "@/lib/api/portfolio.functions";
import { PORTFOLIO_QUERY_KEY, type PortfolioContent } from "@/lib/content.types";

const STALE_TIME = 5 * 60 * 1000;

export function usePortfolioQuery(initialData?: PortfolioContent) {
  return useQuery({
    queryKey: PORTFOLIO_QUERY_KEY,
    queryFn: () => getPortfolioContent(),
    staleTime: STALE_TIME,
    initialData,
  });
}

export { STALE_TIME as PORTFOLIO_STALE_TIME };
