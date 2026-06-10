/**
 * useDataFeedErrors Hook
 *
 * Monitors page state for data feed errors and triggers Toast notifications.
 * This handles client-side sendRequest command errors.
 *
 * Deduplication strategy:
 * - Uses prevDataFeedErrorsRef to detect new payload by reference identity
 * - Uses hasShownRef to prevent double-toast from React Strict Mode double-invoke
 * - When a NEW array reference arrives (new sendRequest call), hasShownRef resets
 *   and toasts are shown again — even if the error text is the same as before
 */

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Toast } from "primereact/toast";

/**
 * Hook that watches page state for dataFeedErrors and shows Toast notifications
 */
export function useDataFeedErrors(
  toastRef: React.RefObject<Toast | null>,
  dataFeedErrors: string[] | undefined,
): void {
  const t = useTranslations("app");
  const prevDataFeedErrorsRef = useRef<string[] | undefined>(undefined);
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!dataFeedErrors || !toastRef.current) {
      return;
    }

    // Detect if this is a new array payload (new sendRequest call)
    const isNewPayload = prevDataFeedErrorsRef.current !== dataFeedErrors;
    prevDataFeedErrorsRef.current = dataFeedErrors;

    if (isNewPayload) {
      hasShownRef.current = false; // reset for new payload
    }

    // Show toasts only once per payload (blocks Strict Mode double-invoke)
    if (dataFeedErrors.length > 0 && !hasShownRef.current) {
      hasShownRef.current = true;
      dataFeedErrors.forEach((error) => {
        toastRef.current?.show({
          severity: "error",
          summary: t("dataFeedError"),
          detail: error,
          life: 5000,
        });
      });
    }
  }, [dataFeedErrors, toastRef, t]);
}
