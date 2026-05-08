import { App, DataFeedResult, MacroSources } from "@/types";
import { AppEngine } from "@/engine";
import {
  initApp,
  getPageConfigByRoute,
  executeServerDataFeeds,
  PageIndex,
  resolveElementStateMacros,
  buildPageIndex,
} from "@/core/config";
import { getServerLocation } from "@/utils/location";
import { getServerEnv } from "@/utils/env";

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
  let route = slug.length > 0 ? `/${slug.join("/")}` : "/";
  let pathParams: string[] = [];

  // Fallback matching: try to find page by route, starting from full path
  let pageConfig: any = null;
  for (let i = slug.length; i >= 0; i--) {
    const testRoute = i > 0 ? "/" + slug.slice(0, i).join("/") : "/";
    const cfg = getPageConfigByRoute(testRoute);
    if (cfg) {
      pageConfig = cfg;
      route = testRoute;
      pathParams = slug.slice(i);
      break;
    }
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
    route,
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
    />
  );
}
