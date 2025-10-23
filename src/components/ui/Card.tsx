import React from "react";
import { Box } from "./Box";
import Paper from "./Paper";
import { Title } from "./Title";
import { Stack } from "./Stack";
import { Button } from "./Button";

type CardActionBase = {
  text?: string;
  icon?: string;
  onClick: () => void;
};

type CardActionContent = {
  key?: React.Key;
  content: React.ReactNode;
};

type CardAction =
  | (CardActionBase & { text: string })
  | (CardActionBase & { icon: string })
  | CardActionContent;

type CardProps = {
  title?: string;
  subtitle?: string;
  icon?: string;
  children?: React.ReactNode;
  // spacing is a Tailwind unit integer used for internal padding defaults
  spacing?: number;
  className?: string;
  // Forwarded Box spacing/margin props (Tailwind integer values)
  p?: number;
  px?: number;
  py?: number;
  pt?: number;
  pb?: number;
  m?: number;
  mx?: number;
  my?: number;
  mt?: number;
  mb?: number;
  actions?: CardAction[];
  collapsible?: boolean;
  collapsed?: boolean;
  collapseOnHeaderClick?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
};

/**
 * Card composes Box + Title with an optional header divider. spacing defaults to 2.
 */
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  children,
  spacing = 2,
  className,
  p,
  px,
  py,
  pt,
  pb,
  m,
  mx,
  my,
  mt,
  mb,
  actions,
  collapsible = false,
  collapsed = false,
  collapseOnHeaderClick = false,
  onCollapseChange,
}) => {
  // Collect Box props to forward
  const boxProps: any = {};
  // NOTE: padding props (p, px, py, pt, pb) should be applied to the inner children wrapper
  // and not forwarded to the main Paper container. Only margin props are forwarded.
  if (m !== undefined) boxProps.m = m;
  if (mx !== undefined) boxProps.mx = mx;
  if (my !== undefined) boxProps.my = my;
  if (mt !== undefined) boxProps.mt = mt;
  if (mb !== undefined) boxProps.mb = mb;

  // Build inner padding class and inline fallback for Boxes inside Paper
  // If explicit padding props are provided, prefer them over spacing default.
  const buildPaddingClass = () => {
    // if any explicit p* provided, build a class list for them; otherwise use spacing
    if (
      p !== undefined ||
      px !== undefined ||
      py !== undefined ||
      pt !== undefined ||
      pb !== undefined
    ) {
      const classes: string[] = [];
      if (p !== undefined) classes.push(`p-${p}`);
      if (px !== undefined) classes.push(`px-${px}`);
      if (py !== undefined) classes.push(`py-${py}`);
      if (pt !== undefined) classes.push(`pt-${pt}`);
      if (pb !== undefined) classes.push(`pb-${pb}`);
      return classes.join(" ");
    }
    return `p-${spacing}`;
  };

  const innerPaddingClass = buildPaddingClass();

  const innerPaddingStyle: React.CSSProperties = {
    // inline fallback uses spacing when explicit values aren't provided
    padding: p !== undefined ? `${p * 0.25}rem` : `${spacing * 0.25}rem`,
    paddingLeft: px !== undefined ? `${px * 0.25}rem` : undefined,
    paddingRight: px !== undefined ? `${px * 0.25}rem` : undefined,
    paddingTop:
      pt !== undefined
        ? `${pt * 0.25}rem`
        : py !== undefined
        ? `${py * 0.25}rem`
        : undefined,
    paddingBottom:
      pb !== undefined
        ? `${pb * 0.25}rem`
        : py !== undefined
        ? `${py * 0.25}rem`
        : undefined,
  };

  const resolvedActions: CardAction[] = actions ?? [];

  // Build header-specific padding that keeps horizontal padding the same as inner
  // padding, but significantly reduces vertical padding to tighten the title bar.
  // We scale vertical padding down to 25% of the base. Tailwind classes require
  // integers, so we floor the scaled value, while inline styles use the exact scale.
  const VERTICAL_SCALE = 0.25;
  const scaleY = (v: number) => v * VERTICAL_SCALE;

  const headerPaddingValues = (() => {
    // derive the base values used by innerPaddingStyle/classes
    const baseAll = p;
    const baseX =
      px !== undefined ? px : baseAll !== undefined ? baseAll : spacing;
    const baseYRaw =
      py !== undefined ? py : baseAll !== undefined ? baseAll : spacing;
    const baseTopRaw = pt !== undefined ? pt : baseYRaw;
    const baseBottomRaw = pb !== undefined ? pb : baseYRaw;

    return {
      x: baseX,
      top: baseTopRaw,
      bottom: baseBottomRaw,
    };
  })();

  const headerPaddingClass = [
    `px-${headerPaddingValues.x}`,
    `pt-${Math.max(0, Math.floor(scaleY(headerPaddingValues.top)))}`,
    `pb-${Math.max(0, Math.floor(scaleY(headerPaddingValues.bottom)))}`,
  ].join(" ");

  const headerPaddingStyle: React.CSSProperties = {
    paddingLeft: `${headerPaddingValues.x * 0.25}rem`,
    paddingRight: `${headerPaddingValues.x * 0.25}rem`,
    paddingTop: `${scaleY(headerPaddingValues.top) * 0.25}rem`,
    paddingBottom: `${scaleY(headerPaddingValues.bottom) * 0.25}rem`,
  };
  const hasTextualHeaderContent = Boolean(title || subtitle);
  const hasIcon = Boolean(icon);
  const hasActions = resolvedActions.length > 0;
  const shouldRenderHeader = hasTextualHeaderContent || hasIcon || hasActions;

  const titleProps: React.ComponentProps<typeof Title> | undefined = (() => {
    if (title && subtitle) {
      return icon ? { title, subtitle, icon } : { title, subtitle };
    }
    if (title) {
      return icon ? { title, icon } : { title };
    }
    if (subtitle) {
      return icon ? { subtitle, icon } : { subtitle };
    }
    return undefined;
  })();

  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

  React.useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const toggleCollapse = React.useCallback(() => {
    if (!collapsible) return;
    setIsCollapsed((prev) => {
      const newState = !prev;
      onCollapseChange?.(newState);
      return newState;
    });
  }, [collapsible, onCollapseChange]);

  const collapseInteractiveProps: React.HTMLAttributes<HTMLDivElement> & {
    "aria-expanded"?: boolean;
  } = collapsible
    ? {
        role: "button",
        tabIndex: 0,
        onClick: () => {
          toggleCollapse();
        },
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCollapse();
          }
        },
        "aria-expanded": !isCollapsed,
      }
    : {};

  const headerInteractiveProps = collapseOnHeaderClick
    ? collapseInteractiveProps
    : {};

  const titleInteractiveProps = !collapseOnHeaderClick
    ? collapseInteractiveProps
    : {};

  const headerFlexStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: hasTextualHeaderContent ? "flex-start" : "center",
    justifyContent: hasTextualHeaderContent ? "space-between" : "flex-end",
    gap: "0.5rem",
    width: "100%",
  };

  const actionsFlexStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "0.5rem",
    flexShrink: 0,
    // When there is no textual header, let actions grow and occupy
    // the remaining space so that large controls (like a search/input)
    // can stretch responsively without pushing outside the header.
    flexGrow: hasTextualHeaderContent ? 0 : 1,
    minWidth: 0,
    width: hasTextualHeaderContent ? undefined : "100%",
    alignSelf: hasTextualHeaderContent ? "center" : undefined,
  };

  const hasBodyContent = React.Children.count(children) > 0;
  const shouldShowHeaderDivider =
    shouldRenderHeader && !isCollapsed && hasBodyContent;

  const headerClassName = [
    headerPaddingClass,
    collapseOnHeaderClick && collapsible
      ? "cursor-pointer select-none"
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const headerStyle: React.CSSProperties = {
    ...headerPaddingStyle,
    ...(collapseOnHeaderClick ? { outline: "none" } : {}),
    ...(shouldShowHeaderDivider
      ? { borderBottom: "1px solid var(--background-modifier-border)" }
      : {}),
  };

  const titleWrapperClassName =
    collapsible && !collapseOnHeaderClick
      ? "cursor-pointer select-none"
      : undefined;

  const titleWrapperStyle: React.CSSProperties = { outline: "none" };

  return (
    // keep Paper unpadded by default; padding will be applied to the inner Boxes
    <Paper p={0} {...boxProps} className={className}>
      {shouldRenderHeader && (
        <Box
          className={headerClassName}
          style={headerStyle}
          data-collapsible={collapsible ? "true" : "false"}
          {...(headerInteractiveProps as any)}
        >
          <Stack
            align={hasTextualHeaderContent ? "start" : "center"}
            justify={hasTextualHeaderContent ? "space-between" : "end"}
            gap={2}
            style={headerFlexStyle}
          >
            {(titleProps || hasIcon) && (
              <div
                className={titleWrapperClassName}
                style={titleWrapperStyle}
                {...(titleInteractiveProps as any)}
              >
                {titleProps ? (
                  <Title {...titleProps} />
                ) : hasIcon ? (
                  // Render icon-only header by providing a zero-width title
                  <Title title={"\u200B"} icon={icon!} />
                ) : null}
              </div>
            )}
            {hasActions && (
              <Stack
                gap={2}
                align="center"
                className={
                  hasTextualHeaderContent
                    ? "shrink-0 self-center"
                    : "flex-1 min-w-0"
                }
                style={actionsFlexStyle}
                onClick={
                  collapseOnHeaderClick
                    ? (event: React.MouseEvent<HTMLDivElement>) => {
                        event.stopPropagation();
                      }
                    : undefined
                }
                onKeyDown={
                  collapseOnHeaderClick
                    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
                        event.stopPropagation();
                      }
                    : undefined
                }
              >
                {resolvedActions.map((action, index) => {
                  if ("content" in action) {
                    const key = action.key ?? `custom-${index}`;

                    return (
                      <div
                        key={key}
                        className="flex items-center flex-1 min-w-0"
                      >
                        {action.content}
                      </div>
                    );
                  }

                  if (!action.text && !action.icon) {
                    throw new Error(
                      "Card action must define at least a text or an icon."
                    );
                  }

                  const key = action.text ?? action.icon ?? String(index);

                  return (
                    <Button
                      key={key}
                      variant="link"
                      icon={action.icon}
                      onClick={action.onClick}
                    >
                      {action.text}
                    </Button>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Box>
      )}

      {!isCollapsed && (
        <Box
          className={[innerPaddingClass, "crm-card-content"].join(" ")}
          style={{
            ...innerPaddingStyle,
            // expose effective horizontal padding as CSS var for full-bleed children
            // consumers (e.g. filters bar) can use negative margins based on this value
            ["--crm-card-pad-x" as any]: `${headerPaddingValues.x * 0.25}rem`,
          }}
        >
          {children}
        </Box>
      )}
    </Paper>
  );
};

export default Card;
