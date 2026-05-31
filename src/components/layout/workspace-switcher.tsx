"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Workspace {
  workspaceId: string;
  organizationId: string;
  name: string;
  role: string;
  isDefault: boolean;
}

/**
 * Workspace switcher shown in the header. For single-workspace users
 * it renders a static label (no dropdown affordance), preserving the
 * single-workspace UX called for in Sprint 1. Multi-workspace users
 * get a dropdown that POSTs to /api/workspaces and reloads so every
 * server component re-resolves against the new active workspace.
 */
export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setWorkspaces(data.workspaces ?? []);
        setActiveId(data.active?.workspaceId ?? null);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const onSwitch = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === activeId) return;
      setSwitching(true);
      try {
        const res = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspaceId }),
        });
        if (res.ok) {
          // Hard reload so all server components re-resolve scope.
          window.location.reload();
        }
      } finally {
        setSwitching(false);
      }
    },
    [activeId],
  );

  if (loading || workspaces.length === 0) return null;

  const active =
    workspaces.find((w) => w.workspaceId === activeId) ?? workspaces[0];

  // Single workspace → static, no dropdown.
  if (workspaces.length === 1) {
    return (
      <div className="hidden items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-300 md:flex">
        <Building2 className="size-4 text-slate-400" />
        <span className="max-w-40 truncate">{active.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md border border-slate-700 px-2 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none data-popup-open:bg-slate-800"
        aria-label="Switch workspace"
        disabled={switching}
      >
        <Building2 className="size-4 text-slate-400" />
        <span className="max-w-40 truncate">{active.name}</span>
        <ChevronsUpDown className="size-3.5 text-slate-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-56 bg-slate-900 text-slate-100 ring-slate-700"
      >
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.workspaceId}
            onClick={() => onSwitch(w.workspaceId)}
            className="text-slate-200 focus:bg-slate-800 focus:text-white"
          >
            <Building2 className="size-4 text-slate-400" />
            <span className="flex-1 truncate">{w.name}</span>
            <span className="text-xs text-slate-500">{w.role}</span>
            {w.workspaceId === active.workspaceId ? (
              <Check className="size-4 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
