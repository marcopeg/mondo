import type { MondoEntityType } from "@/types/MondoEntityTypes";

const splitCommaSeparated = (value: string): string[] => {
  return value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
};

const normalizeToArray = (
  value: unknown
): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : ""))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return splitCommaSeparated(value);
  }

  return [];
};

export const sanitizeEntityTypeList = (
  value: unknown,
  validTypes: readonly MondoEntityType[]
): MondoEntityType[] => {
  const map = new Map(
    validTypes.map((type) => [type.toLowerCase(), type])
  );

  const unique: MondoEntityType[] = [];

  for (const entry of normalizeToArray(value)) {
    const normalized = entry.trim().toLowerCase();
    if (!normalized) {
      continue;
    }

    const canonical = map.get(normalized);
    if (!canonical) {
      continue;
    }

    if (!unique.includes(canonical)) {
      unique.push(canonical);
    }
  }

  return unique;
};

export const formatEntityTypeList = (
  values: readonly MondoEntityType[]
): string => {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  return values.join(", ");
};
