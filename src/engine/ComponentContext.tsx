"use client";

import React, { createContext, useContext } from "react";
import { App, Command } from "@/types";
import { StateManager, ElementIndex } from "@/core";

export interface ComponentContextValue {
  pageId: string;
  pageRoute?: string;
  appConfig?: App;
  stateManager?: StateManager;
  elementIndex?: ElementIndex;
  showToast?: (
    message: string,
    severity?: "success" | "info" | "warn" | "error",
  ) => void;
  navigate?: (url: string) => void;
  confirm?: (message: string) => Promise<boolean>;
  refresh?: (mode: string) => void;
  /** Named command shortcuts from page config */
  shortcuts?: Record<string, Command>;
}

export const ComponentContext = createContext<ComponentContextValue>({
  pageId: "",
});

export const useComponentContext = (): ComponentContextValue => {
  return useContext(ComponentContext);
};

export interface ComponentProviderProps {
  pageId: string;
  pageRoute?: string;
  appConfig?: App;
  stateManager?: StateManager;
  elementIndex?: ElementIndex;
  showToast?: (
    message: string,
    severity?: "success" | "info" | "warn" | "error",
  ) => void;
  navigate?: (url: string) => void;
  confirm?: (message: string) => Promise<boolean>;
  refresh?: (mode: string) => void;
  /** Named command shortcuts from page config */
  shortcuts?: Record<string, Command>;
  children: React.ReactNode;
}

export function ComponentProvider({
  pageId,
  pageRoute,
  appConfig,
  stateManager,
  elementIndex,
  showToast,
  navigate,
  confirm,
  refresh,
  shortcuts,
  children,
}: ComponentProviderProps) {
  return (
    <ComponentContext.Provider
      value={{
        pageId,
        pageRoute,
        appConfig,
        stateManager,
        elementIndex,
        showToast,
        navigate,
        confirm,
        refresh,
        shortcuts,
      }}
    >
      {children}
    </ComponentContext.Provider>
  );
}
