"use client";

import React, { useRef } from "react";
import { Toast } from "primereact/toast";
import { ComponentRendererProps } from "./types";

export function renderToast({ className, style }: ComponentRendererProps) {
  const toastRef = useRef<Toast>(null);
  return <Toast ref={toastRef} className={className} style={style} />;
}
