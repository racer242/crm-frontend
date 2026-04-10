"use client";
import { App } from "@/types";
import { AppEngine } from "@/engine";
import crmConfig from "../../../config/crm-config.json";

const config = crmConfig as unknown as App;

export default function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  return <AppEngine config={config} />;
}
