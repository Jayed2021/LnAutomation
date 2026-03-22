import React, { createContext, useContext, useState, useCallback } from 'react';

interface RefreshContextType {
  lastRefreshed: number;
  isRefreshing: boolean;
  triggerRefresh: () => void;
  setRefreshing: (value: boolean) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within RefreshProvider');
  }
  return context;
};

export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setLastRefreshed(Date.now());
  }, []);

  const setRefreshing = useCallback((value: boolean) => {
    setIsRefreshing(value);
  }, []);

  return (
    <RefreshContext.Provider value={{ lastRefreshed, isRefreshing, triggerRefresh, setRefreshing }}>
      {children}
    </RefreshContext.Provider>
  );
};
