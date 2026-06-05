"use client";
import React, { createContext, useContext } from "react";

interface NavigationContextType {
  navigate: (page: string) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  navigate: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider = ({
  children,
  navigate,
}: {
  children: React.ReactNode;
  navigate: (page: string) => void;
}) => {
  return (
    <NavigationContext.Provider value={{ navigate }}>
      {children}
    </NavigationContext.Provider>
  );
};
