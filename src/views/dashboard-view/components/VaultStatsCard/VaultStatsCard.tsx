import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Typography } from "@/components/ui/Typography";
import { useVaultStats } from "./useVaultStats";

const formatter = new Intl.NumberFormat();

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) {
    return "0B";
  }

  const units = [
    { limit: 1024 ** 3, suffix: "Gb" },
    { limit: 1024 ** 2, suffix: "Mb" },
    { limit: 1024, suffix: "kB" },
  ];

  for (const unit of units) {
    if (bytes >= unit.limit) {
      const value = bytes / unit.limit;
      if (value >= 100) return `${value.toFixed(0)}${unit.suffix}`;
      if (value >= 10) return `${value.toFixed(1)}${unit.suffix}`;
      return `${value.toFixed(2)}${unit.suffix}`;
    }
  }

  return `${bytes.toFixed(0)}B`;
};

export const VaultStatsCard = () => {
  const stats = useVaultStats();

  const items = useMemo(
    () => [
      {
        key: "notes",
        label: "Notes",
        count: stats.notes.count,
        size: stats.notes.size,
      },
      {
        key: "images",
        label: "Images",
        count: stats.images.count,
        size: stats.images.size,
      },
      {
        key: "audio",
        label: "Audio",
        count: stats.audio.count,
        size: stats.audio.size,
      },
      {
        key: "files",
        label: "Files",
        count: stats.files.count,
        size: stats.files.size,
      },
    ],
    [stats]
  );

  return (
    <Card spacing={6}>
      <Typography
        as="div"
        className="mb-6 text-center text-sm font-medium text-[var(--text-muted)]"
        variant="body"
      >
        Total size • {formatBytes(stats.totalSize)}
      </Typography>
      <div className="grid gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex flex-col items-center justify-center gap-3"
          >
            <Typography
              as="div"
              className="text-lg font-semibold text-[var(--text-normal)]"
              variant="body"
            >
              {formatter.format(item.count)} {item.label}
            </Typography>
            <div className="h-px w-12 bg-[var(--background-modifier-border)]" />
            <Typography as="div" className="text-sm" variant="muted">
              {formatBytes(item.size)}
            </Typography>
          </div>
        ))}
      </div>
    </Card>
  );
};
