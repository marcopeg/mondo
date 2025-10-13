import React from "react";
import { Box } from "./Box";
import Paper from "./Paper";
import { Title } from "./Title";
import Separator from "./Separator";
import { Stack } from "./Stack";
import { Button } from "./Button";

type CardActionBase = {
  text?: string;
  icon?: string;
  onClick: () => void;
};

type CardAction =
  | (CardActionBase & { text: string })
  | (CardActionBase & { icon: string });

type CardProps = {
  title?: string;
  subtitle?: string;
  icon?: string;
  children?: React.ReactNode;
  // spacing is a Tailwind unit integer used for internal padding and separator spacing
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
};

/**
 * Card composes Box + Title + Separator. spacing defaults to 2.
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
  const resolvedPadding = {
    p,
    px,
    py,
    pt,
    pb,
  };

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
    setIsCollapsed((prev) => !prev);
  }, [collapsible]);

  const titleInteractiveProps = collapsible
    ? {
        role: "button",
        tabIndex: 0,
        onClick: toggleCollapse,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCollapse();
          }
        },
        "aria-expanded": !isCollapsed,
      }
    : {};

  return (
    // keep Paper unpadded by default; padding will be applied to the inner Boxes
    <Paper p={0} {...boxProps} className={className}>
      {shouldRenderHeader && (
        <Box
          className={[innerPaddingClass, "mb-2", "p-2"].join(" ")}
          style={innerPaddingStyle}
          data-collapsible={collapsible ? "true" : "false"}
        >
          <Stack
            align={hasTextualHeaderContent ? "start" : "center"}
            justify={hasTextualHeaderContent ? "space-between" : "end"}
            className="w-full"
            gap={2}
          >
            {titleProps && (
              <div
                className={collapsible ? "cursor-pointer select-none" : undefined}
                style={{ outline: "none" }}
                {...(titleInteractiveProps as any)}
              >
                <Title {...titleProps} />
              </div>
            )}
            {hasActions && (
              <Stack
                gap={2}
                align="center"
                className={
                  hasTextualHeaderContent ? "shrink-0 self-start" : "shrink-0"
                }
              >
                {resolvedActions.map((action, index) => {
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

      {(title || subtitle) && (
        // Separator sits flush with Paper edges because it's outside the padded Box
        <Separator spacing={0} spacingBefore={0} spacingAfter={0} />
      )}

      {!isCollapsed && (
        <Box className={innerPaddingClass} style={innerPaddingStyle}>
          {children}
        </Box>
      )}
    </Paper>
  );
};

export default Card;
