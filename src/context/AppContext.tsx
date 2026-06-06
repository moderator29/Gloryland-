import React, { createContext, useContext, useState, ReactNode } from "react";

interface AppContextType {
  selectedAmount: number;
  setSelectedAmount: (amount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  return (
    <AppContext.Provider value={{ selectedAmount, setSelectedAmount }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppProvider");
  return context;
};
