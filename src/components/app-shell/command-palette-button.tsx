"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommandPaletteButton() {
  return (
    <Button
      variant="outline"
      className="relative h-7 w-7 p-0 md:h-8 md:w-56 md:justify-start md:px-3 md:py-1.5"
      onClick={() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      }}
    >
      <Search className="size-4 md:mr-2" />
      <span className="hidden md:inline-flex text-sm text-muted-foreground">
        검색...
      </span>
      <kbd className="pointer-events-none absolute right-1.5 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
        <span className="text-xs">Ctrl</span>K
      </kbd>
    </Button>
  );
}
