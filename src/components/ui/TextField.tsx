import React, { forwardRef } from "react";

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className = "setting-input flex-1", ...props }, ref) => {
    return <input ref={ref} type="text" className={className} {...props} />;
  }
);

TextField.displayName = "TextField";

export default TextField;
