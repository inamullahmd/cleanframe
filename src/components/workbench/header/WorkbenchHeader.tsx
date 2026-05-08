"use client";

import Image from "next/image";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SettingsDialog } from "@/components/workbench/settings/SettingsDialog";

export function WorkbenchHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <PanelLeft className="size-4" />
        </Button>

        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Cleanframe"
            width={26}
            height={26}
            priority
            className="size-6 object-contain"
          />

          <span className="font-brand text-[1.05rem] font-semibold tracking-[-0.03em] text-foreground">
            Cleanframe
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1.5">
        <SettingsDialog />
        <ThemeToggle />
      </div>
    </header>
  );
}