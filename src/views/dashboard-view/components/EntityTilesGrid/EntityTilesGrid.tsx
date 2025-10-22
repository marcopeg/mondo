import { Icon } from "@/components/ui/Icon";
import React from "react";

export type EntityTileItem = {
  type: string;
  title: string;
  icon: string;
};

type EntityTilesGridProps = {
  items: EntityTileItem[];
  onOpen: (type: string) => void;
};

/**
 * A flat tiles wall inspired by Cortana: square tiles with centered icon and text.
 * - 2 tiles per row on mobile
 * - Uses Obsidian theme variables for colors and borders
 * - No dependency on ui/Button (plain clickable divs)
 */
export const EntityTilesGrid: React.FC<EntityTilesGridProps> = ({
  items,
  onOpen,
}) => {
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    type: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(type);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.type}
          role="button"
          tabIndex={0}
          aria-label={`Open ${item.title}`}
          title={`Open ${item.title}`}
          onClick={() => onOpen(item.type)}
          onKeyDown={(e) => handleKeyDown(e, item.type)}
          className={[
            // square, centered content
            "aspect-square",
            "flex flex-col items-center justify-center text-center",
            // visual style: flat tile
            "rounded-md border",
            "bg-[var(--background-primary)]",
            "border-[var(--background-modifier-border)]",
            // hover/active states
            "hover:bg-[var(--background-modifier-hover)]",
            "cursor-pointer select-none transition-colors",
            // text
            "text-[var(--text-normal)]",
          ].join(" ")}
        >
          <Icon name={item.icon} className="w-8 h-8 mb-2" />
          <div className="text-xs sm:text-sm font-medium leading-tight px-2">
            {item.title}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EntityTilesGrid;
