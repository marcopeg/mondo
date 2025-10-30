import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

type CollapsedPanelSummary = {
  id: string;
  label: string;
  icon?: string;
  badgeLabel?: string;
  onExpand: () => void;
  order: number;
  panelType: string;
};

type EntityLinksLayoutContextValue = {
  collapsedPanels: CollapsedPanelSummary[];
  setCollapsedPanel: (
    panelId: string,
    summary: CollapsedPanelSummary | null
  ) => void;
};

const defaultContextValue: EntityLinksLayoutContextValue = {
  collapsedPanels: [],
  setCollapsedPanel: () => {
    // no-op default — components may render outside of the provider in tests
  },
};

const EntityLinksLayoutContext = createContext<EntityLinksLayoutContextValue>(
  defaultContextValue
);

type EntityLinksLayoutProviderProps = {
  children: ReactNode;
};

export const EntityLinksLayoutProvider = ({
  children,
}: EntityLinksLayoutProviderProps) => {
  const [panels, setPanels] = useState<Map<string, CollapsedPanelSummary>>(
    () => new Map()
  );

  const setCollapsedPanel = useCallback(
    (panelId: string, summary: CollapsedPanelSummary | null) => {
      setPanels((previous) => {
        const next = new Map(previous);

        if (!summary) {
          if (!next.has(panelId)) {
            return previous;
          }
          next.delete(panelId);
          return next;
        }

        const existing = next.get(panelId);
        if (
          existing &&
          existing.label === summary.label &&
          existing.icon === summary.icon &&
          existing.badgeLabel === summary.badgeLabel &&
          existing.order === summary.order &&
          existing.onExpand === summary.onExpand &&
          existing.panelType === summary.panelType
        ) {
          return previous;
        }

        next.set(panelId, summary);
        return next;
      });
    },
    []
  );

  const value = useMemo(() => {
    const collapsedPanels = Array.from(panels.values()).sort((a, b) => {
      if (a.order === b.order) {
        return a.label.localeCompare(b.label);
      }
      return a.order - b.order;
    });

    return {
      collapsedPanels,
      setCollapsedPanel,
    } satisfies EntityLinksLayoutContextValue;
  }, [panels, setCollapsedPanel]);

  return (
    <EntityLinksLayoutContext.Provider value={value}>
      {children}
    </EntityLinksLayoutContext.Provider>
  );
};

export const useEntityLinksLayout = () => {
  return useContext(EntityLinksLayoutContext);
};

export type { CollapsedPanelSummary };

