export type PrivacySettings = { shareRunStats: boolean };

export function defaultPrivacySettings(): PrivacySettings {
  return { shareRunStats: true };
}

export function parsePrivacySettings(raw: string | null): PrivacySettings {
  if (raw === null) {
    return defaultPrivacySettings();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const share = (parsed as Record<string, unknown> | null)?.shareRunStats;
    return typeof share === "boolean" ? { shareRunStats: share } : defaultPrivacySettings();
  } catch {
    return defaultPrivacySettings();
  }
}
