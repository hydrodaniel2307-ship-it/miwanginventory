"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ScanLine } from "lucide-react";
import { navItems } from "@/lib/nav-items";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function runCommand(command: () => void) {
    setOpen(false);
    command();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="검색어를 입력하세요..." />
      <CommandList>
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        <CommandGroup heading="페이지 이동">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => runCommand(() => router.push(item.href))}
            >
              <item.icon className="mr-2 size-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="빠른 작업">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/products/new"))}
          >
            <Plus className="mr-2 size-4" />
            상품 추가
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/scan"))}
          >
            <ScanLine className="mr-2 size-4" />
            바코드 스캔
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
