"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Bot,
  Brain,
  FileText,
  Globe,
  Plug,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/boards", label: "Boards", icon: Kanban },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/browser", label: "Browser", icon: Globe },
  { href: "/mcps", label: "MCPs", icon: Plug },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-atlas-surface border-r border-atlas-border flex flex-col">
      <div className="p-4 border-b border-atlas-border">
        <h1 className="text-lg font-bold text-atlas-accent tracking-wider">
          A.T.L.A.S.
        </h1>
        <p className="text-xs text-atlas-text-muted mt-1">
          Agent Supervision Hub
        </p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-atlas-accent/10 text-atlas-accent"
                  : "text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-border/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-atlas-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-atlas-success animate-pulse" />
          <span className="text-xs text-atlas-text-muted">System Online</span>
        </div>
      </div>
    </aside>
  );
}
