import { App, DataFeedResult } from "@/types";
import { AppEngine } from "@/engine";
import {
  initApp,
  getPageConfigByRoute,
  executeServerDataFeeds,
  PageIndex,
  resolveElementStateMacros,
} from "@/core/config";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  // Initialize CRM App Singleton (loads config once per application lifetime)
  const { config, elementIndex } = await initApp();

  // Resolve the route from params
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const route = slug && slug.length > 0 ? `/${slug.join("/")}` : "/";

  // Get page configuration (deep copy to avoid mutating global config)
  const pageConfig = structuredClone(getPageConfigByRoute(route) ?? {});

  // Resolve macros in all element states (page, sections, blocks, components)
  resolveElementStateMacros(pageConfig, {
    location: {
      pathname: route,
      search: "",
      href: route,
      origin: "",
      protocol: "",
      host: "",
      hostname: "",
      port: "",
      hash: "",
    } as Location,
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

  // Get per-page index (plain object, serializable)
  const pageIndex: PageIndex =
    pageConfig && elementIndex ? elementIndex[pageConfig.id] || {} : {};

  return (
    <AppEngine
      config={minimalConfig as unknown as App}
      elementIndex={pageIndex}
      dataFeedErrors={dataFeedErrors}
      initialDataFeed={successResults}
      initialPageId={initialPageId}
    />
  );
}
