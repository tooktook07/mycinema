import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface PaginationProps extends React.ComponentProps<"nav"> {}

const Pagination = ({ className, ...props }: PaginationProps) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

interface PaginationContentProps extends React.ComponentProps<"ul"> {}

const PaginationContent = forwardRef<HTMLUListElement, PaginationContentProps>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
);
PaginationContent.displayName = "PaginationContent";

interface PaginationItemProps extends React.ComponentProps<"li"> {}

const PaginationItem = forwardRef<HTMLLIElement, PaginationItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
  )
);
PaginationItem.displayName = "PaginationItem";

interface PaginationLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

const PaginationLink = ({
  className,
  isActive,
  disabled,
  ...props
}: PaginationLinkProps) => (
  <button
    aria-current={isActive ? "page" : undefined}
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "h-10 w-10",
      isActive
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "bg-background hover:bg-accent hover:text-accent-foreground border border-input",
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

interface PaginationPreviousProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

const PaginationPrevious = ({
  className,
  disabled,
  ...props
}: PaginationPreviousProps) => (
  <button
    aria-label="Go to previous page"
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "h-10 px-4 py-2",
      "bg-background hover:bg-accent hover:text-accent-foreground border border-input",
      className
    )}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </button>
);
PaginationPrevious.displayName = "PaginationPrevious";

interface PaginationNextProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

const PaginationNext = ({
  className,
  disabled,
  ...props
}: PaginationNextProps) => (
  <button
    aria-label="Go to next page"
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "h-10 px-4 py-2",
      "bg-background hover:bg-accent hover:text-accent-foreground border border-input",
      className
    )}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </button>
);
PaginationNext.displayName = "PaginationNext";

interface PaginationEllipsisProps extends React.ComponentProps<"span"> {}

const PaginationEllipsis = ({
  className,
  ...props
}: PaginationEllipsisProps) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
