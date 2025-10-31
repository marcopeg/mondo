import QuickSearchPanel from "./QuickSearchPanel";
import type { MondoEntityType } from "@/types/MondoEntityTypes";

export type QuickSearchItem = {
  type: MondoEntityType;
  title: string;
  icon?: string;
};

export type QuickSearchProps = {
  items: QuickSearchItem[];
  onOpenEntityPanel: (type: string) => void;
};

export const QuickSearch = ({ items, onOpenEntityPanel }: QuickSearchProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <QuickSearchPanel
          key={item.type}
          entityType={item.type}
          icon={item.icon}
          title={item.title}
          onOpenAll={onOpenEntityPanel}
        />
      ))}
    </div>
  );
};

export default QuickSearch;
