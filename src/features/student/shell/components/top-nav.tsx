"use client";

import Image from "next/image";
import { Icon } from "@/components/ui/icon";

export function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container flex items-center justify-between h-14 px-4">
      <Image
        src="/logos/black.png"
        alt=""
        aria-hidden
        width={1466}
        height={243}
        priority
        className="h-7 w-auto"
      />
      <button
        type="button"
        onClick={onMenuToggle}
        className="p-2 -mr-2 text-on-surface-variant hover:text-primary active:scale-95 transition-all"
        aria-label="メニューを開く"
      >
        <Icon name="menu" className="text-2xl" />
      </button>
    </header>
  );
}
