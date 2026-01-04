"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

interface CollapsibleTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

const CollapsibleContext = React.createContext<{
  isOpen: boolean;
  toggle: () => void;
}>({
  isOpen: false,
  toggle: () => {},
});

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ children, defaultOpen = false, className }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

    return (
      <CollapsibleContext.Provider value={{ isOpen, toggle }}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    );
  }
);
Collapsible.displayName = "Collapsible";

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(({ children, className }, ref) => {
  const { isOpen, toggle } = React.useContext(CollapsibleContext);

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      className={cn(
        "flex w-full items-center justify-between text-left",
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  CollapsibleContentProps
>(({ children, className }, ref) => {
  const { isOpen } = React.useContext(CollapsibleContext);

  if (!isOpen) return null;

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      {children}
    </div>
  );
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
