const UNITS = [
  { limit: 1024 ** 3, suffix: "Gb" },
  { limit: 1024 ** 2, suffix: "Mb" },
  { limit: 1024, suffix: "kB" },
];

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) {
    return "0B";
  }

  for (const unit of UNITS) {
    if (bytes >= unit.limit) {
      const value = bytes / unit.limit;
      if (value >= 100) return `${value.toFixed(0)}${unit.suffix}`;
      if (value >= 10) return `${value.toFixed(1)}${unit.suffix}`;
      return `${value.toFixed(2)}${unit.suffix}`;
    }
  }

  return `${bytes.toFixed(0)}B`;
};
