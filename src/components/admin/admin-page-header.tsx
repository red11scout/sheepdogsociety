import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onCreateClick?: () => void;
  createLabel?: string;
  children?: React.ReactNode; // extra filter controls
};

export function AdminPageHeader({
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  onCreateClick,
  createLabel = "Create",
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {onCreateClick && (
          <Button onClick={onCreateClick} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
      {(onSearchChange || children) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onSearchChange && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
