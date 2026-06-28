import type { AnalyticsEvent } from "@/lib/types";

export function buildAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent & { occurredAt: string } {
  return {
    ...event,
    occurredAt: new Date().toISOString()
  };
}

export async function trackAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  const payload = buildAnalyticsEvent(event);

  if (typeof window !== "undefined") {
    const existing = window.localStorage.getItem("giant_analytics_events");
    const events = existing ? (JSON.parse(existing) as unknown[]) : [];
    window.localStorage.setItem("giant_analytics_events", JSON.stringify([...events, payload].slice(-200)));
  }
}
