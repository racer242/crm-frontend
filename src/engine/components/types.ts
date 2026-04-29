import { Component } from "@/types";
import { CSSProperties } from "react";

export interface ComponentRendererProps {
  component: Component;
  props: Record<string, any>;
  className?: string;
  style?: CSSProperties;
  handleEvent: (eventType: string, eventValue: any) => void;
}
