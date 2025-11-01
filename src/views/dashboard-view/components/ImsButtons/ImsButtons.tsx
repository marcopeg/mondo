import { useCallback, useMemo } from "react";
import { Typography } from "@/components/ui/Typography";
import { useApp } from "@/hooks/use-app";
import { MONDO_ENTITIES, MONDO_UI_CONFIG } from "@/entities";
import EntityTilesGrid from "../EntityTilesGrid";

export const ImsButtons = () => {
  const app = useApp();

  const entityTiles = useMemo(() => {
    const order = MONDO_UI_CONFIG?.tiles?.order ?? [];
    return order
      .map((type) => MONDO_ENTITIES[type])
      .filter(Boolean)
      .map((config) => ({
        type: config.type,
        icon: config.icon,
        title: config.name,
      }));
  }, []);

  const onOpenEntityPanel = useCallback(
    (entityType: string) => {
      const normalized = entityType?.trim();
      if (!normalized) return;
      (app as any).commands.executeCommandById(`mondo:open-${normalized}`);
    },
    [app]
  );

  if (entityTiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Typography variant="h1">Mondo Entities</Typography>
      <EntityTilesGrid items={entityTiles} onOpen={onOpenEntityPanel} />
    </div>
  );
};
