import { App, CampItem, DataFeedResult, MacroSources } from "@/types";
import { AppEngine } from "@/engine";
import {
  initApp,
  getConfigForCamp,
  getPageConfigByRoute,
  findPageByRoute,
  PageIndex,
  buildPageIndex,
} from "@/core/config";
import { getServerLocation } from "@/utils/location";
import { getServerEnv } from "@/utils/env";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  executeServerDataFeeds,
  resolveElementStateMacros,
} from "@/core/DataFeedServerService";
import { executeDataInit } from "@/core/DataInitServerService";
import { buildInitialDataFeed } from "@/utils/initialResult";
import { getAccessTokenServer } from "@/utils/getAccessToken";
import { ApiError } from "@/utils/parseApiError";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Initialize CRM App Singleton: loads the reference config and builds the
  // per-campaign config registry once per application lifetime
  await initApp();

  // Resolve the route from params with fallback matching
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  let route: string | null = null;
  let pathParams: string[] = [];
  let routeParams: Record<string, string> = {};
  let pageConfig: any = null;

  // Read cookies early: camp_id selects the campaign config for this request
  const cookieStore = await cookies();
  const cookieMap: Record<string, string> = {};
  cookieStore.getAll().forEach((c) => {
    cookieMap[c.name] = c.value;
  });

  // Determine the current campaign (fallback: first camp) and ADDRESS its
  // config in the registry — no global switching, race-free by construction:
  // every request works with its own local reference.
  const allCamps: CampItem[] = (getConfigForCamp(null) as any)?.camps || [];
  const campIdCookie = cookieMap["camp_id"];
  const currentCampId = campIdCookie
    ? Number(campIdCookie)
    : allCamps[0]?.id || 0;
  const currentCamp =
    allCamps.find((c: CampItem) => c.id === currentCampId) || allCamps[0];
  const config = getConfigForCamp(currentCampId);

  // If accessing "/" and indexPageId is configured, redirect to that page
  if (slug.length === 0 && config.config?.indexPageId) {
    const indexPage = config.pages?.find(
      (p: any) => p.id === config.config.indexPageId,
    );
    if (indexPage && indexPage.route) {
      pageConfig = getPageConfigByRoute(indexPage.route, config);
      if (pageConfig) {
        route = indexPage.route;
      }
    }
  }

  // Fallback matching: try to find page by route, starting from full path
  // Supports [id]-style route patterns like /users/[id] or /users/[id]/edit
  if (!pageConfig) {
    for (let i = slug.length; i >= 0; i--) {
      const testRoute: string | null =
        i > 0 ? "/" + slug.slice(0, i).join("/") : null;
      const match = findPageByRoute(testRoute, config);
      if (match) {
        pageConfig = match.pageConfig;
        route = match.route;
        routeParams = match.routeParams;
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
    routeParams,
  );

  // Create shared server sources for macros
  const serverSources: MacroSources = {
    config: config.config,
    env: await getServerEnv(),
    location,
    cookies: cookieMap,
  };

  // Resolve macros in all element states (page, sections, blocks, components)
  resolveElementStateMacros(clonedPageConfig, serverSources);

  // Execute server-side data feeds if page has dataFeed config
  let dataFeedErrors: ApiError[] = [];
  let successResults: DataFeedResult[] = [];
  let initialPageId: string | null = null;

  // Get user's access_token for authenticated API requests
  const accessToken = await getAccessTokenServer();

  // Server-side data init: collect initial values from URL params/config
  // macros. Правила parse/priority/method исполняются ЗДЕСЬ, на сервере —
  // клиент получает очередь initialDataFeed, полностью готовую к применению.
  const initDataResults = executeDataInit(
    clonedPageConfig?.dataInit,
    null as any,
    serverSources,
  );

  if (clonedPageConfig && clonedPageConfig.dataFeed) {
    const pageId = clonedPageConfig.id || "";
    initialPageId = pageId;
    const results: DataFeedResult[] = await executeServerDataFeeds(
      pageId,
      clonedPageConfig,
      serverSources,
      accessToken,
      currentCamp?.base_api_url,
      config,
    );

    // Separate errors from successful results
    dataFeedErrors = results
      .filter((r) => !r.success && r.error)
      .map((r) => r.error as ApiError);

    successResults = results.filter((r) => r.success);
  }

  // Умный мердж правил dataInit на сервере: merge-записи вливаются в те
  // результаты фидов, на которые указывают (чипы = metadata filters + URL),
  // priority определяет фазу очереди. В AppEngine уходят только чистые
  // записи на перезапись — без method/priority.
  const initialDataFeed = buildInitialDataFeed(
    initDataResults,
    successResults,
    clonedPageConfig?.state,
  );

  // Filter camps for client: strip server-only fields (base_api_url, crm_*), pass only id + name
  const clientCamps: { id: number; name: string; current: boolean }[] =
    allCamps.map((c: CampItem) => ({
      id: c.id,
      name: c.name,
      current: c.id === currentCampId,
    }));

  // Create minimal config with only current page (strip server-only apiRoutes, camps api_url)
  const { apiRoutes: _, ...configForClient } = config;
  const minimalConfig = {
    ...configForClient,
    pages: clonedPageConfig ? [clonedPageConfig] : [],
    camps: clientCamps,
    currentCampName: currentCamp?.name || "",
    currentCampId: currentCamp?.id || 0,
    // UI-фичи только ТЕКУЩЕЙ кампании: управляют видимостью меню/элементов
    // (фильтрация в движке). Фичи остальных кампаний и секреты остаются на сервере.
    currentCampFeatures: currentCamp?.features || {},
  };

  return (
    <AppEngine
      config={minimalConfig as unknown as App}
      elementIndex={elementIndex}
      dataFeedErrors={dataFeedErrors}
      initialDataFeed={initialDataFeed}
      initialPageId={initialPageId}
      route={route ?? undefined}
    />
  );
}
