import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import PeopleTable from "@/components/PeopleTable";
import RestaurantsTable from "@/components/RestaurantsTable";
import GearTable from "@/components/GearTable";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

export const LocationLinks = () => {
  const { file } = useEntityFile();

  const peopleList = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (personCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        // people link to locations via the `location` frontmatter property
        return matchesPropertyLink(personCached, "location", file.file);
      },
      [file]
    ),
  });

  const restaurantsList = useFiles(CRMFileType.RESTAURANT, {
    filter: useCallback(
      (restaurantCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesPropertyLink(restaurantCached, "location", file.file);
      },
      [file]
    ),
  });

  const gearList = useFiles(CRMFileType.GEAR, {
    filter: useCallback(
      (gearCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesPropertyLink(gearCached, "location", file.file);
      },
      [file]
    ),
  });

  return (
    <>
      <Card
        icon={"map-pin"}
        title="People"
        subtitle="People at this location"
        mt={4}
        p={0}
      >
        <PeopleTable items={peopleList} />
      </Card>
      <Card
        icon={"utensils"}
        title="Restaurants"
        subtitle="Restaurants associated to this location"
        mt={4}
        p={0}
      >
        <RestaurantsTable items={restaurantsList} />
      </Card>
      <Card
        icon={"settings"}
        title="Gear"
        subtitle="Gear stored at this location"
        mt={4}
        p={0}
      >
        <GearTable items={gearList} />
      </Card>
    </>
  );
};
