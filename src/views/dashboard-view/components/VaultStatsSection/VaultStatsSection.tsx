import VaultStatsCard from "../VaultStatsCard";
import { useSetting } from "@/hooks/use-setting";

export const VaultStatsSection = () => {
  const statsDisabled = useSetting<boolean>("dashboard.disableStats", true);

  if (statsDisabled) {
    return null;
  }

  return <VaultStatsCard />;
};
