"use client";

import React from "react";
import { Skeleton } from "primereact/skeleton";
import { Chip } from "primereact/chip";
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";
import { Tag } from "primereact/tag";
import { ComponentRendererProps } from "./types";

export function renderSkeleton({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Skeleton {...props} className={`${className || ""} mb-2`} style={style} />
  );
}

export function renderChip({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Chip {...props} className={`${className || ""} mr-2 mb-2`} style={style} />
  );
}

export function renderAvatar({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Avatar {...props} className={`${className || ""} mr-2`} style={style} />
  );
}

export function renderBadge({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return <Badge {...props} className={className || ""} style={style} />;
}

export function renderTag({ props, className, style }: ComponentRendererProps) {
  return <Tag {...props} className={className || ""} style={style} />;
}
