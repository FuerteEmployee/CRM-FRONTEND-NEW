import React, { createContext, useContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/api/services/finance.service";
import { usePermissionContext } from "@/context/PermissionContext";

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
  // GET /api/currencies needs Settings › View (admins always). Staff without
  // it (e.g. a Purchase Orders maker) got a 403 in the console on every page —
  // skip the call for them; the ₹ defaults below are used instead.
  const { user, canView } = usePermissionContext();
  const allowed = !!user && canView("Settings");
  // Share the same query key as SetupCurrencies so both use the same cached data
  const { data: currencies = [], refetch: refetchQuery } = useQuery<Currency[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    // No token yet (e.g. on the public login page) — skip the call instead
    // of firing a guaranteed 401.
    enabled: !!localStorage.getItem("crm_token") && allowed,
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
    // A plain invalidate wouldn't actually fetch while the query is
    // `enabled: false` pre-login — call the query's own refetch, which
    // fetches regardless of `enabled`, so currencies load right after login.
    // Skipped without Settings › View (the query turns on by itself once the
    // signed-in user is known and allowed).
    if (allowed) refetchQuery();
  }, [refetchQuery, allowed]);

  return (
    <CurrencyContext.Provider
      value={{ symbol, placement, decimalSeparator, thousandSeparator, formatAmount, defaultCurrency, refetch }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
