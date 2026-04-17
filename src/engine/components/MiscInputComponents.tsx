"use client";

import React from "react";
import { ColorPicker } from "primereact/colorpicker";
import { FileUpload } from "primereact/fileupload";
import { ComponentRendererProps } from "./types";

export function renderColorPicker({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  return (
    <div className="flex align-items-center mb-2">
      <ColorPicker
        {...props}
        className={className}
        style={style}
        onChange={(e) => handleEvent("onChange", { value: e.value })}
      />
    </div>
  );
}

export function renderFileUpload({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <div className="mb-3">
      <FileUpload
        {...props}
        className={`w-full ${className || ""}`}
        style={style}
      />
    </div>
  );
}
