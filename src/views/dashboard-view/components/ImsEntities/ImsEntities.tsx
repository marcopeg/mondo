import { useCallback, useMemo } from "react";
import { Typography } from "@/components/ui/Typography";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import QuickSearch from "../../QuickSearch";
import { MONDO_ENTITIES, MONDO_UI_CONFIG } from "@/entities";
import type { MondoEntityType } from "@/types/MondoEntityTypes";

export const ImsEntities = () => {
  const app = useApp();
  const quickSearchOverride = useSetting<MondoEntityType[]>(
    "dashboard.quickSearchEntities",
    []
  );

  const quickSearchItems = useMemo(() => {
    const configured = MONDO_UI_CONFIG?.quickSearch?.entities ?? [];
    const source =
      Array.isArray(quickSearchOverride) && quickSearchOverride.length > 0
        ? quickSearchOverride
        : configured;
    return source
      .map((type) => MONDO_ENTITIES[type])
      .filter(Boolean)
      .map((config) => ({
        type: config.type,
        icon: config.icon,
        title: config.name,
      }));
  }, [quickSearchOverride]);

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
      <Typography variant="h1">IMS Quick Search</Typography>
      <QuickSearch items={quickSearchItems} onOpenEntityPanel={onOpenEntityPanel} />
    </div>
  );
};
