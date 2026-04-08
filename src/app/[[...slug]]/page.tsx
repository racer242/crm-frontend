"use client";

import { App } from "@/types";
import { AppEngine } from "@/engine";
import crmConfig from "../../../config/crm-config.json";

// Конфигурация загружена статически - нет необходимости в async загрузке
const config = crmConfig as unknown as App;

export default function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  return <AppEngine config={config} />;
}
