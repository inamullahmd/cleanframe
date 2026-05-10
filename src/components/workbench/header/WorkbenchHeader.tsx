"use client";

import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function WorkbenchHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Cleanframe"
          width={18}
          height={18}
          className="rounded"
        />
        <span className="text-sm font-bold tracking-[-0.02em] text-foreground">
          Cleanframe
        </span>
      </Link>

      <ThemeToggle />
    </header>
  );
}