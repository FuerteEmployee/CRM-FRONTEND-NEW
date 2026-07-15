import React, { createContext, useContext, useState, useEffect } from "react";
import { storeApi } from "@/hrms/services/api";
import type { Store } from "@/hrms/types";

interface StoreContextType {
  stores: Store[];
  selectedStoreId: string;
  setSelectedStoreId: (id: string) => void;
  isLoading: boolean;
  refreshStores: () => Promise<Store[] | undefined>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    return localStorage.getItem("selected_store_id") || "";
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshStores = async () => {
    setIsLoading(true);
    try {
      const res = await storeApi.getAll();
      const data = res.data || [];
      setStores(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStores().then((data) => {
      if (!data || data.length === 0) return;

      const getId = (s: any) => s.id || s._id || "";

      // If no store selected OR the saved ID no longer exists in the list → pick first
      const savedId = localStorage.getItem("selected_store_id") || "";
      const exists = savedId && data.some((s) => getId(s) === savedId);

      if (!exists) {
        const firstId = getId(data[0]);
        if (firstId) {
          setSelectedStoreId(firstId);
          localStorage.setItem("selected_store_id", firstId);
        }
      }
    });
  }, []);

  const handleSetSelectedStoreId = (id: string) => {
    setSelectedStoreId(id);
    localStorage.setItem("selected_store_id", id);
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStoreId,
        setSelectedStoreId: handleSetSelectedStoreId,
        isLoading,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
