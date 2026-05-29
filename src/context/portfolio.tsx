import { createContext, useContext } from "react";

import type { PortfolioContent } from "@/lib/content.types";
import { DEFAULT_PORTFOLIO_CONTENT } from "@/lib/portfolio-defaults";

const PortfolioContext = createContext<PortfolioContent>(DEFAULT_PORTFOLIO_CONTENT);

export function PortfolioProvider({
  content,
  children,
}: {
  content: PortfolioContent;
  children: React.ReactNode;
}) {
  return <PortfolioContext.Provider value={content}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}
