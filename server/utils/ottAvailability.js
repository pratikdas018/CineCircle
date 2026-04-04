const PLATFORM_RULES = [
  { matcher: /netflix/i, normalized: "Netflix" },
  { matcher: /(amazon|prime(\s+video)?|amazon\s+video)/i, normalized: "Amazon Prime Video" },
  { matcher: /(disney|hotstar)/i, normalized: "Disney+ Hotstar" },
  { matcher: /hulu/i, normalized: "Hulu" },
  { matcher: /(apple\s*tv|appletv)/i, normalized: "Apple TV+" },
];

const FALLBACK_PLATFORMS = [
  "Netflix",
  "Amazon Prime Video",
  "Disney+ Hotstar",
  "Hulu",
  "Apple TV+",
];

export const normalizePlatformName = (platform = "") => {
  const value = String(platform).trim();
  if (!value) return "";

  const matchedRule = PLATFORM_RULES.find((rule) => rule.matcher.test(value));
  return matchedRule ? matchedRule.normalized : value;
};

export const normalizePlatformList = (platforms = []) =>
  [...new Set((platforms || []).map(normalizePlatformName).filter(Boolean))];

export const getOTTAvailability = (title = "") => {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("avengers")) {
    return ["Netflix"];
  }

  if (normalizedTitle.includes("batman")) {
    return ["Amazon Prime Video"];
  }

  const randomPlatform =
    FALLBACK_PLATFORMS[Math.floor(Math.random() * FALLBACK_PLATFORMS.length)];
  return [randomPlatform];
};

