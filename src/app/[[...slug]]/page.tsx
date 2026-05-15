import { App, DataFeedResult, MacroSources } from "@/types";
import { AppEngine } from "@/engine";
import {
  initApp,
  getPageConfigByRoute,
  PageIndex,
  buildPageIndex,
} from "@/core/config";
import { getServerLocation } from "@/utils/location";
import { getServerEnv } from "@/utils/env";
import { notFound } from "next/navigation";
import {
  executeServerDataFeeds,
  resolveElementStateMacros,
} from "@/core/DataFeedServerService";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Initialize CRM App Singleton (loads config once per application lifetime)
  const { config } = await initApp();

  // Resolve the route from params with fallback matching
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  let route: string | null = null;
  let pathParams: string[] = [];
  let pageConfig: any = null;

  // If accessing "/" and indexPageId is configured, redirect to that page
  if (slug.length === 0 && config.config?.indexPageId) {
    const indexPage = config.pages?.find(
      (p: any) => p.id === config.config.indexPageId,
    );
    if (indexPage && indexPage.route) {
      pageConfig = getPageConfigByRoute(indexPage.route);
      if (pageConfig) {
        route = indexPage.route;
      }
    }
  }

  // Fallback matching: try to find page by route, starting from full path
  if (!pageConfig) {
    for (let i = slug.length; i >= 0; i--) {
      const testRoute: string | null =
        i > 0 ? "/" + slug.slice(0, i).join("/") : null;
      const cfg = getPageConfigByRoute(testRoute);
      if (cfg) {
        pageConfig = cfg;
        route = testRoute;
        pathParams = slug.slice(i);
        break;
      }
    }
  }

  // If no page found, show 404
  if (!pageConfig) {
    notFound();
  }

  // Build element index for current page only
  const clonedPageConfig = structuredClone(pageConfig ?? {});
  const elementIndex: PageIndex = clonedPageConfig
    ? buildPageIndex(clonedPageConfig)
    : {};

  // Get server location with URL params and path params
  const resolvedSearchParams = await searchParams;
  const location = await getServerLocation(
    resolvedSearchParams,
    route ?? undefined,
    pathParams,
  );

  // Create shared server sources for macros
  const serverSources: MacroSources = {
    config: config.config,
    env: getServerEnv(),
    location,
  };

  // Resolve macros in all element states (page, sections, blocks, components)
  resolveElementStateMacros(clonedPageConfig, serverSources);

  // Execute server-side data feeds if page has dataFeed config
  let dataFeedErrors: string[] = [];
  let successResults: DataFeedResult[] = [];
  let initialPageId: string | null = null;

  if (clonedPageConfig && clonedPageConfig.dataFeed) {
    const pageId = clonedPageConfig.id || "";
    initialPageId = pageId;
    const results: DataFeedResult[] = await executeServerDataFeeds(
      pageId,
      clonedPageConfig,
      serverSources,
    );

    // Separate errors from successful results
    dataFeedErrors = results
      .filter((r) => !r.success && r.error)
      .map((r) => r.error as string);

    successResults = results.filter((r) => r.success);
  }

  // Create minimal config with only current page
  const minimalConfig = {
    ...config,
    pages: clonedPageConfig ? [clonedPageConfig] : [],
  };

  return (
    <AppEngine
      config={minimalConfig as unknown as App}
      elementIndex={elementIndex}
      dataFeedErrors={dataFeedErrors}
      initialDataFeed={successResults}
      initialPageId={initialPageId}
      route={route ?? undefined}
    />
  );
}
