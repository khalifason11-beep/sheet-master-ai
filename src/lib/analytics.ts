// Lightweight analytics abstraction. Swap the sink for PostHog/GA later
// without touching call sites.
type EventName =
  | "lesson_started"
  | "lesson_completed"
  | "formula_viewed"
  | "formula_saved"
  | "bookmark_added"
  | "bookmark_removed"
  | "ai_message_sent"
  | "ai_quota_exceeded"
  | "file_uploaded"
  | "settings_updated"
  | "auth_signed_in"
  | "auth_signed_out";

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    posthog?: { capture: (name: string, props?: Props) => void };
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: EventName, props: Props = {}) {
  if (typeof window === "undefined") return;
  try {
    window.posthog?.capture(event, props);
    window.gtag?.("event", event, props);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event, props);
    }
  } catch {
    /* noop */
  }
}
