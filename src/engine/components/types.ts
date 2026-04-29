import { Component, App } from "@/types";
import { CSSProperties } from "react";
import { StateManager, ElementIndex } from "@/core";

export interface ComponentRendererProps {
  component: Component;
  props: Record<string, any>;
  className?: string;
  style?: CSSProperties;
  handleEvent: (eventType: string, eventValue: any) => void;
  pageId?: string;
  appConfig?: App;
  stateManager?: StateManager;
  elementIndex?: ElementIndex;
  showToast?: (
    message: string,
    severity?: "success" | "info" | "warn" | "error",
  ) => void;
  navigate?: (url: string) => void;
  confirm?: (message: string) => Promise<boolean>;
}
