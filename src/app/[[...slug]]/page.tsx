import { App, DataFeedResult } from "@/types";
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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Initialize CRM App Singleton (loads config once per application lifetime)
  const { config } = await initApp();

  // Resolve the route from params
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const route = slug && slug.length > 0 ? `/${slug.join("/")}` : "/";

  // Get page configuration (deep copy to avoid mutating global config)
  const pageConfig = structuredClone(getPageConfigByRoute(route) ?? {});

  // Build element index for current page only
  const elementIndex: PageIndex = pageConfig ? buildPageIndex(pageConfig) : {};

  // Get server location with URL params
  const resolvedSearchParams = await searchParams;
  const location = await getServerLocation(resolvedSearchParams, route);

  // Resolve macros in all element states (page, sections, blocks, components)
  resolveElementStateMacros(pageConfig, {
    location,
  });

  // Execute server-side data feeds if page has dataFeed config
  let dataFeedErrors: string[] = [];
  let successResults: DataFeedResult[] = [];
  let initialPageId: string | null = null;

  if (pageConfig && pageConfig.dataFeed) {
    const pageId = pageConfig.id || "";
    initialPageId = pageId;
    const results: DataFeedResult[] = await executeServerDataFeeds(
      pageId,
      pageConfig,
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
    pages: pageConfig ? [pageConfig] : [],
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
