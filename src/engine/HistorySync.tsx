"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Синхронизация состояния страницы с историей браузера (Back/Forward).
 *
 * URL-команды движка (setUrlParams/mergeUrlParams/...) меняют адрес через
 * window.history.pushState. Next патчит pushState и прикрепляет к записи
 * своё дерево (app-router.js: `__NA` + internals tree), поэтому Back/Forward
 * на такую запись восстанавливает дерево из клиентского кэша роутера БЕЗ
 * перезапуска сервера: AppEngine монтируется с кэшированным initialDataFeed,
 * собранным для прежнего URL — данные не соответствуют адресу (например,
 * исходный список при URL с ?search=...).
 *
 * Listener живёт именно здесь, на уровне root layout, а не в AppEngine:
 * при Back через границу страниц popstate обрабатывает ещё смонтированный
 * старый AppEngine — его cleanup при размонтировании отменял бы отложенный
 * refresh, а новый инстанс вешает listener уже после события. HistorySync
 * переживает любые клиентские навигации.
 *
 * На popstate (после того как Next синхронизирует router state с URL записи —
 * restore-действие диспетчеризуется синхронно в popstate-обработчике Next)
 * вызываем router.refresh(): SSR пересобирает initialDataFeed по фактическому
 * URL, re-apply эффект AppEngine применяет его к state (сравнение по
 * содержимому отсекает no-op перезаписи). setTimeout(0) гарантирует порядок:
 * редьюсер роутера обрабатывает restore, затем refresh — уже по
 * восстановленному дереву.
 */
export function HistorySync() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onPopState = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (timer !== null) clearTimeout(timer);
    };
  }, [router]);

  return null;
}