import { App } from "@/types";
import { AppEngine } from "@/engine";
import { initApp } from "@/core/config";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  // Initialize CRM App Singleton (loads config once per application lifetime)
  const config = await initApp();

  return <AppEngine config={config as unknown as App} />;
}
