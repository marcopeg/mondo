import VaultStatsCard from "../VaultStatsCard";
import { useSetting } from "@/hooks/use-setting";

export const VaultStatsSection = () => {
  const statsEnabled = useSetting<boolean>("dashboard.enableStats", true);

  if (!statsEnabled) {
    return null;
  }

  return <VaultStatsCard />;
};
