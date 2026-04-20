/**
 * useDataFeedErrors Hook
 *
 * Monitors page state for data feed errors and triggers Toast notifications.
 * This handles client-side sendRequest command errors.
 */

import { useEffect, useRef } from "react";
import { Toast } from "primereact/toast";

/**
 * Hook that watches page state for dataFeedErrors and shows Toast notifications
 */
export function useDataFeedErrors(
  toastRef: React.RefObject<Toast | null>,
  dataFeedErrors: string[] | undefined,
): void {
  const prevErrorsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!dataFeedErrors || !toastRef.current) {
      return;
    }

    // Find new errors that weren't in the previous list
    const prevErrors = prevErrorsRef.current;
    const newErrors = dataFeedErrors.filter((err) => !prevErrors.includes(err));

    // Show Toast for each new error
    newErrors.forEach((error) => {
      toastRef.current?.show({
        severity: "error",
        summary: "Data Feed Error",
        detail: error,
        life: 5000,
      });
    });

    // Update previous errors
    prevErrorsRef.current = [...dataFeedErrors];
  }, [dataFeedErrors, toastRef]);
}
