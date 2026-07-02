import React, { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/api/services/finance.service";

interface Currency {
  _id: string;
  name: string;
  symbol: string;
  decimal_separator: string;
  thousand_separator: string;
  placement: "before" | "after";
  isdefault: boolean;
}

interface CurrencyContextType {
  symbol: string;
  placement: "before" | "after";
  decimalSeparator: string;
  thousandSeparator: string;
  formatAmount: (value: number, fractionDigits?: number) => string;
  defaultCurrency: Currency | null;
  refetch: () => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  symbol: "₹",
  placement: "before",
  decimalSeparator: ".",
  thousandSeparator: ",",
  formatAmount: (v, d = 2) => `₹${v.toFixed(d)}`,
  defaultCurrency: null,
  refetch: () => {},
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Share the same query key as SetupCurrencies so both use the same cached data
  const { data: currencies = [] } = useQuery<Currency[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const defaultCurrency: Currency | null =
    currencies.find((c) => c.isdefault) ?? currencies[0] ?? null;

  const symbol = defaultCurrency?.symbol ?? "₹";
  const placement = defaultCurrency?.placement ?? "before";
  const decimalSeparator = defaultCurrency?.decimal_separator ?? ".";
  const thousandSeparator = defaultCurrency?.thousand_separator ?? ",";

  const formatAmount = useCallback(
    (value: number, fractionDigits = 2): string => {
      const parts = Math.abs(value).toFixed(fractionDigits).split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
      const formatted = parts.join(decimalSeparator);
      const signed = value < 0 ? `-${formatted}` : formatted;
      return placement === "before" ? `${symbol}${signed}` : `${signed}${symbol}`;
    },
    [symbol, placement, decimalSeparator, thousandSeparator]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["currencies"] });
  }, [queryClient]);

  return (
    <CurrencyContext.Provider
      value={{ symbol, placement, decimalSeparator, thousandSeparator, formatAmount, defaultCurrency, refetch }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
