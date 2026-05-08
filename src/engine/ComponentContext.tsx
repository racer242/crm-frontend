"use client";

import React, { createContext, useContext } from "react";
import { App } from "@/types";
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
      }}
    >
      {children}
    </ComponentContext.Provider>
  );
}
