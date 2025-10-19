// Title component displays an Obsidian-style settings title + subtitle.
// At least one of `title` or `subtitle` must be provided.

import { Icon } from "./Icon";

type TitleProps =
  | { title: string; subtitle?: string }
  | { title?: string; subtitle: string };

// allow an optional icon name
type PropsWithIcon = TitleProps & { icon?: string };

export const Title = ({ title, subtitle, icon }: PropsWithIcon) => {
  // Runtime guard (in case of any improper usage through JS interop)
  if (!title && !subtitle) {
    throw new Error("Title component requires at least a title or a subtitle.");
  }

  return (
    <div className="setting-item-info flex min-h-12 items-center">
      <div className="flex items-center">
        {icon && <Icon name={icon} />}
        <div className="flex flex-col justify-center gap-1">
          {title && <div className="setting-item-name">{title}</div>}
          {subtitle && (
            <div className="setting-item-description">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};
