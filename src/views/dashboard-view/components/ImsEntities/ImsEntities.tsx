import { useCallback, useMemo } from "react";
import { Typography } from "@/components/ui/Typography";
import { useApp } from "@/hooks/use-app";
import QuickSearch from "../../QuickSearch";
import { MONDO_ENTITIES, MONDO_UI_CONFIG } from "@/entities";

export const ImsEntities = () => {
  const app = useApp();

  const quickSearchItems = useMemo(() => {
    const configured = MONDO_UI_CONFIG?.quickSearch?.entities ?? [];
    return configured
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

  if (quickSearchItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Typography variant="h1">IMS Entities Quick Search</Typography>
      <QuickSearch items={quickSearchItems} onOpenEntityPanel={onOpenEntityPanel} />
    </div>
  );
};
