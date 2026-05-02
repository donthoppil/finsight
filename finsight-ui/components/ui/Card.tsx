import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-2xl p-6 shadow-card border border-line-soft",
          className
        )}
        {...props}
      />
    );
  }
);
