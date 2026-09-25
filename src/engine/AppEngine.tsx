"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useTranslations } from "next-intl";
import { App, Page, NavItem, DataFeedResult, Command } from "@/types";
import { PageRenderer } from "./PageRenderer";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { StateManager, ElementIndex } from "@/core";
import { PageIndex } from "@/core/config";
import { usePathname, useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import { useDataFeedErrors } from "./hooks/useDataFeedErrors";
import { ApiError } from "@/utils/parseApiError";
import { PathResolver } from "@/core/PathResolver";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { ComponentProvider } from "./ComponentContext";
import { FileUpload } from "primereact/fileupload";

export function AppEngine({
  config,
  elementIndex,
  dataFeedErrors: initialErrors,
  initialDataFeed,
  initialPageId,
  route: initialRoute,
}: {
  config: App;
  elementIndex: PageIndex;
  dataFeedErrors?: ApiError[];
  initialDataFeed?: DataFeedResult[];
  initialPageId?: string | null;
  route?: string;
}) {
  const pathname = usePathname();

  // Create ElementIndex from per-page plain object (no rebuild needed)
  const elementIndexRef = useRef<ElementIndex | null>(null);
  if (!elementIndexRef.current) {
    elementIndexRef.current = new ElementIndex(elementIndex);
  }
  const resolvedIndex = elementIndexRef.current!;

  const stateManagerRef = useRef<StateManager | null>(null);
  const prevPageIdRef = useRef<string | null>(null);
  if (!stateManagerRef.current) {
    stateManagerRef.current = new StateManager(
      config,
      resolvedIndex,
      initialDataFeed,
      initialPageId || undefined,
    );
  }
  const stateManager = stateManagerRef.current!;

  // Resolve route with fallback matching for client-side navigation
  const resolveRouteWithFallback = useCallback(
    (path: string): string => {
      const slug = path.split("/").filter(Boolean);
      for (let i = slug.length; i >= 0; i--) {
        const testRoute = i > 0 ? "/" + slug.slice(0, i).join("/") : "/";
        if (stateManager.getPageByRoute(testRoute)) return testRoute;
      }
      return "/";
    },
    [stateManager],
  );

  // Use initialRoute from server (with fallback matching already applied)
  // or resolve on client-side with fallback
  const route = initialRoute ?? resolveRouteWithFallback(pathname);

  // On client-side navigation, re-apply initialDataFeed for the new page.
  // Also re-apply when the feed content differs from the CURRENT client state:
  // otherwise the "Обновить" buttons (refresh command -> router.refresh())
  // would fetch fresh data on the server but never update the client state.
  useEffect(() => {
    // Resolve page to get its ID (with fallback matching).
    // ВАЖНО: сначала серверный маршрут (initialRoute — шаблон вида
    // "/x/[param]"), а не resolveRouteWithFallback(pathname): getPageByRoute
    // сравнивает строго, реальный URL с динамическим сегментом шаблону не
    // равен — newPageId получался null, и применение фида после
    // router.refresh() пропускалось (targetId = elementId || newPageId = null).
    const resolvedRoute = initialRoute ?? resolveRouteWithFallback(pathname);
    const page = stateManager.getPageByRoute(resolvedRoute);
    const newPageId = page?.id || initialPageId || null;

    // Собираем только те результаты фида, которые отличаются от ТЕКУЩЕГО
    // состояния. Сравнение с live-состоянием (а не с сигнатурой последнего
    // применённого фида) обязательно: клиентские изменения state (например,
    // «Применить» с вложенным GET, редактирование продукта) уводят state от
    // последнего SSR-фида, и повторная доставка ТОГО ЖЕ фида должна вернуть
    // state к серверным данным, хотя сигнатура фида не изменилась.
    const pending: {
      targetId: string;
      statePath: string | null;
      data: unknown;
    }[] = [];
    for (const result of initialDataFeed ?? []) {
      if (!result.success || !result.target) continue;
      const { elementId, statePath } = PathResolver.parseTarget(result.target);
      const targetId = elementId || newPageId;
      if (!targetId) continue;

      const currentValue = statePath
        ? stateManager.getStateField(targetId, statePath)
        : stateManager.getState(targetId);
      if (
        JSON.stringify(currentValue ?? null) ===
        JSON.stringify(result.data ?? null)
      ) {
        continue; // данные совпадают с состоянием — перезапись не нужна
      }
      pending.push({ targetId, statePath: statePath || null, data: result.data });
    }

    if (process.env.NODE_ENV === "development") {
      // Диагностика re-гидрации SSR-фида после router.refresh() (команда refresh).
      // Смотрим в консоли БРАУЗЕРА: applying — сколько результатов отличается
      // от текущего состояния и будет применено.
      console.log(
        "[AppEngine feed]",
        JSON.stringify({
          page: newPageId,
          applying: pending.length,
          of: initialDataFeed?.length ?? 0,
          results: (initialDataFeed ?? []).map((r) => ({
            target: r.target,
            ok: r.success,
            head: JSON.stringify(r.data ?? null)?.slice(0, 100),
          })),
        }),
      );
    }

    for (const item of pending) {
      if (item.statePath) {
        stateManager.setStateField(item.targetId, item.statePath, item.data);
      } else if (typeof item.data === "object" && item.data !== null) {
        // No path: merge data into existing state
        stateManager.mergeState(item.targetId, item.data as Record<string, any>);
      }
    }

    prevPageIdRef.current = newPageId;
  }, [
    pathname,
    initialDataFeed,
    initialRoute,
    initialPageId,
    stateManager,
    resolveRouteWithFallback,
  ]);

  const [currentPage, setCurrentPage] = useState<Page | null>(() => {
    return stateManager.getPageByRoute(route);
  });

  useEffect(() => {
    const page = stateManager.getPageByRoute(route);
    if (page) {
      setCurrentPage(page);
    }
  }, [route, stateManager]);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      forceUpdate((n) => n + 1);
    });
    return unsubscribe;
  }, [stateManager]);

  const router = useRouter();

  // Redirect to 404 on client-side navigation (separate effect after router declaration)
  useEffect(() => {
    const page = stateManager.getPageByRoute(route);
    if (!page) {
      router.replace("/404");
    }
  }, [route, stateManager, router]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const toastRef = useRef<Toast>(null);

  const t = useTranslations("app");

  // Deduplicate server-side data feed errors to avoid double toast in Strict Mode
  const shownErrorsRef = useRef<ApiError[]>([]);

  // Helper to get message from ApiError for dedup comparison
  const getErrorKey = (err: ApiError): string =>
    err.message || err.rawText || "";

  // Show server-side data feed errors on mount
  useEffect(() => {
    if (initialErrors && initialErrors.length > 0 && toastRef.current) {
      // Only show errors that haven't been shown before
      const shownKeys = shownErrorsRef.current.map(getErrorKey);
      const newErrors = initialErrors.filter(
        (err) => !shownKeys.includes(getErrorKey(err)),
      );
      if (newErrors.length > 0) {
        shownErrorsRef.current = [...initialErrors];
        newErrors.forEach((error) => {
          toastRef.current?.show({
            severity: "error",
            summary: t("dataFeedError"),
            detail: getErrorKey(error),
            life: 5000,
          });
        });
      }
    }
  }, [initialErrors, t]);

  // Track client-side data feed errors from page state
  const [dataFeedErrors, setDataFeedErrors] = useState<ApiError[]>([]);

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(
      (elementPath, changedPath, oldState, newState) => {
        // Check if dataFeedErrors changed in page state
        if (currentPage && elementPath === currentPage.id) {
          const newErrors: ApiError[] = newState?.dataFeedErrors || [];
          setDataFeedErrors(newErrors);
        }
      },
    );
    return unsubscribe;
  }, [stateManager, currentPage]);

  // Use the hook to display client-side errors
  useDataFeedErrors(toastRef, dataFeedErrors);

  // Callbacks for command execution
  const showToast = useCallback(
    (message: string, severity?: "success" | "info" | "warn" | "error") => {
      toastRef.current?.show({
        severity: severity || "info",
        summary:
          severity === "error"
            ? t("error")
            : severity === "success"
              ? t("success")
              : t("info"),
        detail: message,
        life: 5000,
      });
    },
    [t],
  );

  const navigate = useCallback(
    (url: string) => {
      router.push(url);
    },
    [router],
  );

  const onCollapseChange = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const confirm = useCallback(
    (message: string): Promise<boolean> => {
      return new Promise((resolve) => {
        confirmDialog({
          message,
          header: t("confirmation"),
          icon: "pi pi-exclamation-triangle",
          accept: () => resolve(true),
          reject: () => resolve(false),
        });
      });
    },
    [t],
  );

  const refresh = useCallback(
    (mode: string) => {
      switch (mode) {
        case "replace":
          router.replace(window.location.pathname + window.location.search);
          break;
        case "reload":
          window.location.reload();
          break;
        default: // "refresh"
          router.refresh();
      }
    },
    [router],
  );

  if (!currentPage) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <p className="text-500">
          {t("pageNotFound", { route: route || pathname })}
        </p>
      </div>
    );
  }

  const navItems: NavItem[] = config.navbar?.items || [];
  const title = config.title || t("defaultTitle");

  // Campaign data from config (passed via SSR)
  const camps = (config as any)?.camps || [];
  const currentCampName = (config as any)?.currentCampName || "";
  const currentCampId = (config as any)?.currentCampId || 0;

  return (
    <div className="flex flex-column md:flex-row min-h-screen surface-100">
      <Toast ref={toastRef} />
      <ConfirmDialog />
      <DashboardHeader
        title={title}
        userMenu={config.userMenu}
        onMenuClick={() => setMobileMenuOpen(true)}
        currentCampName={currentCampName}
      />
      {navItems.length > 0 && (
        <DashboardSidebar
          items={navItems}
          title={title}
          userMenu={config.userMenu}
          mobileOpen={mobileMenuOpen}
          collapsed={collapsed}
          onMobileOpenChange={setMobileMenuOpen}
          onCollapseChange={onCollapseChange}
          camps={camps}
          currentCampId={currentCampId}
          currentCampName={currentCampName}
        />
      )}
      <main className="flex-1 overflow-auto pt-4rem md:pt-0">
        <div className="px-4 py-5 md:px-6 lg:px-8 max-w-screen-xl mx-auto">
          <ComponentProvider
            pageId={currentPage.id}
            pageRoute={route}
            appConfig={config}
            stateManager={stateManager}
            elementIndex={resolvedIndex}
            showToast={showToast}
            navigate={navigate}
            confirm={confirm}
            refresh={refresh}
            shortcuts={currentPage.shortcuts}
          >
            <PageRenderer page={currentPage} />
            {/* Убирает FOUC при переходе между страницами */}
            <FileUpload
              mode="basic"
              disabled={true}
              style={{ display: "none" }}
            />
          </ComponentProvider>
        </div>
      </main>
    </div>
  );
}
