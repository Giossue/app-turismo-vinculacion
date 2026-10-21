import * as Sentry from "@sentry/react-native";

import { scrubBreadcrumb, scrubErrorEvent } from "./error-report-privacy";

export function getErrorReportingDsn(): string | undefined {
  return process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || undefined;
}

/**
 * Starts crash and error reporting when the build defines
 * `EXPO_PUBLIC_SENTRY_DSN`; without it nothing is initialized or sent.
 * Reports are anonymous and filtered (`error-report-privacy.ts`); there is no
 * session replay, screenshot, view hierarchy or performance tracing.
 */
export function initErrorReporting(): void {
  const dsn = getErrorReportingDsn();
  if (!dsn) return;

  Sentry.init({
    dsn,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    beforeSend: (event) => scrubErrorEvent(event),
    environment: __DEV__ ? "development" : "production",
    sendDefaultPii: false,
  });
}
