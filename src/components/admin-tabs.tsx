"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminTabs({ sections }: { sections: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {sections.map((section) => {
        const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              isActive
                ? "border-department text-department"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
