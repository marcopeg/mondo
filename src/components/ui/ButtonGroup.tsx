import React from "react";

export type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

const isElement = (
  child: React.ReactNode
): child is React.ReactElement<{ className?: string } & Record<string, unknown>> =>
  React.isValidElement(child);

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  ...rest
}) => {
  const baseClass = "crm-button-group";
  const classes = [baseClass, className].filter(Boolean).join(" ");

  const items = React.Children.toArray(children).filter(isElement);

  return (
    <div className={classes} {...rest}>
      {items.map((child, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const childClassName = [
          child.props.className,
          "crm-button-group__button",
          isFirst ? "crm-button-group__button--first" : null,
          isLast ? "crm-button-group__button--last" : null,
          !isFirst && !isLast ? "crm-button-group__button--middle" : null,
        ]
          .filter(Boolean)
          .join(" ");

        return React.cloneElement(child, {
          className: childClassName,
        });
      })}
    </div>
  );
};

export default ButtonGroup;
