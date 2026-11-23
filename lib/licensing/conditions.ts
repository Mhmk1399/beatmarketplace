export type LicenseConditions = {
  commercialUse: boolean; creditRequired: boolean; creditText: string;
  streamingLimit: number | null; distributionLimit: number | null; musicVideoLimit: number | null;
  livePerformance: boolean; broadcastRights: boolean; contentIdAllowed: boolean | null;
  termMonths: number | null; royaltyPercent: number | null; publishingSharePercent: number | null;
  governingLaw: string;
  territory: { worldwide: boolean; includedCountries: string[]; excludedCountries: string[] };
};

/** Explicit, stable defaults for legacy records; unspecified financial rights remain unspecified. */
export function licenseConditions(terms: Partial<LicenseConditions> = {}, territory?: LicenseConditions["territory"]): LicenseConditions {
  return {
    commercialUse: terms.commercialUse ?? true, creditRequired: terms.creditRequired ?? true, creditText: terms.creditText ?? "",
    streamingLimit: terms.streamingLimit ?? null, distributionLimit: terms.distributionLimit ?? null, musicVideoLimit: terms.musicVideoLimit ?? null,
    livePerformance: terms.livePerformance ?? false, broadcastRights: terms.broadcastRights ?? false,
    contentIdAllowed: terms.contentIdAllowed ?? null, termMonths: terms.termMonths ?? null,
    royaltyPercent: terms.royaltyPercent ?? null, publishingSharePercent: terms.publishingSharePercent ?? null,
    governingLaw: terms.governingLaw ?? "",
    territory: { worldwide: territory?.worldwide ?? true, includedCountries: [...(territory?.includedCountries ?? [])], excludedCountries: [...(territory?.excludedCountries ?? [])] },
  };
}

export function conditionRows(c: LicenseConditions): [string, string][] {
  const limit = (value: number | null) => value === null ? "Unlimited" : value.toLocaleString("en-US");
  const territory = c.territory.worldwide ? "Worldwide" : c.territory.includedCountries.join(", ");
  return [
    ["Commercial use", c.commercialUse ? "Allowed" : "Not allowed"],
    ["Producer credit", c.creditRequired ? `Required${c.creditText ? `: ${c.creditText}` : ""}` : "Not required"],
    ["Audio streams", limit(c.streamingLimit)], ["Distribution copies", limit(c.distributionLimit)],
    ["Music videos", limit(c.musicVideoLimit)], ["Live performances", c.livePerformance ? "Allowed" : "Not allowed"],
    ["Broadcast / radio", c.broadcastRights ? "Allowed" : "Not allowed"],
    ["Content ID registration", c.contentIdAllowed === null ? "Not specified" : c.contentIdAllowed ? "Allowed" : "Not allowed"],
    ["License duration", c.termMonths === null ? "No fixed expiry" : `${c.termMonths} months from verified payment`],
    ["Territory", `${territory}${c.territory.excludedCountries.length ? `; excluding ${c.territory.excludedCountries.join(", ")}` : ""}`],
    ["Producer share of new master net receipts", c.royaltyPercent === null ? "Not specified" : `${c.royaltyPercent}%`],
    ["Producer share of new composition publishing", c.publishingSharePercent === null ? "Not specified" : `${c.publishingSharePercent}%`],
    ["Governing law / jurisdiction", c.governingLaw || "Not specified"],
  ];
}
