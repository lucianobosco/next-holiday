export interface Holiday {
  date: string;
  localName: string;
  name: string;
  counties: string[] | null;
  types: string[];
  // Only on local holidays: the town it belongs to.
  locality?: string;
}

export interface LocalHolidayRaw {
  date: string;
  localName: string;
  locality: string;
  province: string;
  communityCode: string;
  confidence: "high" | "low";
}

export interface CommunityInfo {
  code: string;
  name: string;
}

// The enriched view of a holiday -- image and description -- from Wikipedia or from a
// curated override.
export interface HolidayInfo {
  title: string;
  description: string;
  imageUrl: string | null;
  pageUrl: string | null;
  credit: string | null;
}
