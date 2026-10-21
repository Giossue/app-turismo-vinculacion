import type { Breadcrumb, ErrorEvent } from "@sentry/react-native";

/**
 * Privacy filter for error reports (see `docs/security/privacy-location.md`).
 * Reports keep the stack, versions and technical messages; they never carry
 * the person's account, precise location, credentials or request bodies.
 */

const redacted = "[filtrado]";
const redactedLocation = "[ubicación]";
const redactedEmail = "[correo]";
const redactedToken = "[token]";

/** Object keys whose value is dropped whatever it contains. */
const sensitiveKeyPatterns = [
  /^(lat|lng|lon|long|latitude|longitude|origin|destination|position)$/i,
  /coord|location|ubicaci|token|password|contrase|secret|authorization|cookie|email|correo|body|payload/i,
];

const emailPattern = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const bearerPattern = /\bBearer\s+[\w.~+/=-]+/gi;
const jwtPattern = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
/** A coordinate pair such as `-1.5923, -79.0012` or `-79.0012,-1.5923`. */
const coordinatePairPattern = /-?\d{1,3}\.\d{3,}\s*[,;/ ]\s*-?\d{1,3}\.\d{3,}/g;
/** A lone high-precision decimal is treated as a possible coordinate. */
const preciseDecimalPattern = /(?<![\w.])-?\d{1,3}\.\d{4,}(?![\w.])/g;

const maxDepth = 6;

export function scrubText(text: string): string {
  return text
    .replace(bearerPattern, `Bearer ${redactedToken}`)
    .replace(jwtPattern, redactedToken)
    .replace(emailPattern, redactedEmail)
    .replace(coordinatePairPattern, redactedLocation)
    .replace(preciseDecimalPattern, redactedLocation);
}

/**
 * Keeps scheme, host and path of a URL; query and fragment may carry
 * coordinates, search terms or tokens, so they are always removed.
 */
export function scrubUrl(url: string): string {
  const [withoutQuery = ""] = url.split(/[?#]/, 1);
  return scrubText(withoutQuery);
}

export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= maxDepth) return redacted;
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (sensitiveKeyPatterns.some((pattern) => pattern.test(key))) {
      result[key] = redacted;
    } else if (key === "url" && typeof item === "string") {
      result[key] = scrubUrl(item);
    } else {
      result[key] = scrubValue(item, depth + 1);
    }
  }
  return result;
}

function scrubRecord(
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return record ? (scrubValue(record) as Record<string, unknown>) : record;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return {
    ...breadcrumb,
    data: scrubRecord(breadcrumb.data),
    message:
      breadcrumb.message === undefined
        ? undefined
        : scrubText(breadcrumb.message),
  };
}

export function scrubErrorEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = {
    ...event,
    // The account is never attached: reports stay anonymous.
    user: undefined,
    message: event.message === undefined ? undefined : scrubText(event.message),
    extra: scrubRecord(event.extra),
    contexts: event.contexts
      ? (scrubValue(event.contexts) as ErrorEvent["contexts"])
      : event.contexts,
    breadcrumbs: event.breadcrumbs?.map(scrubBreadcrumb),
  };

  if (event.request) {
    scrubbed.request = {
      method: event.request.method,
      url: event.request.url ? scrubUrl(event.request.url) : undefined,
    };
  }

  if (event.exception?.values) {
    scrubbed.exception = {
      ...event.exception,
      values: event.exception.values.map((exception) => ({
        ...exception,
        value:
          exception.value === undefined
            ? undefined
            : scrubText(exception.value),
      })),
    };
  }

  if (event.logentry) {
    scrubbed.logentry = {
      ...event.logentry,
      message:
        event.logentry.message === undefined
          ? undefined
          : scrubText(event.logentry.message),
      params: event.logentry.params?.map((param) => scrubValue(param)),
    };
  }

  return scrubbed;
}
