"use client";

import { useEffect, useState } from "react";
import { App } from "@/types";
import { AppEngine } from "@/engine";
import crmConfig from "../../../config/crm-config.json";

const config = crmConfig as unknown as App;

export default function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  // Skip SSR to avoid PrimeReact hydration mismatch (auto-generated IDs)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return <AppEngine config={config} />;
}
