"use client";

import { useEffect, useMemo, useState } from "react";
import { BoqTrackerShell } from "@/components/boq-tracker/boq-tracker-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
}

export default function BoqTrackerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState(true);

  const loadProjects = async (preferredProjectId?: string | null) => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects/list", { cache: "no-store" });
      const json = await res.json();
      const list: Project[] = json.success ? (json.data?.projects ?? []) : [];
      const activeProjectIdFromServer: string | null = json.success
        ? (json.data?.activeProjectId ?? null)
        : null;

      setProjects(list);
      if (list.length === 0) {
        setProjectId("");
        return;
      }

      const desiredId = preferredProjectId ?? activeProjectIdFromServer ?? "";
      const desiredExists = desiredId && list.some((project) => project.id === desiredId);
      setProjectId((current) => {
        if (desiredExists) return desiredId;
        if (current && list.some((project) => project.id === current)) return current;
        return list[0].id;
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjects();

    const handleContextChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string | null }>).detail;
      void loadProjects(detail?.projectId ?? null);
    };

    window.addEventListener("infradyn:context-changed", handleContextChanged);
    return () => {
      window.removeEventListener("infradyn:context-changed", handleContextChanged);
    };
  }, []);

  const selectedProjectName = useMemo(
    () => projects.find((project) => project.id === projectId)?.name,
    [projects, projectId],
  );

  return (
    <div className="flex flex-col min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-4 pt-4 pb-3 shrink-0 border-b mb-0">
        <div>
          <h1 className="text-base font-semibold tracking-tight">BOQ Tracker</h1>
          {selectedProjectName && (
            <p className="text-xs text-muted-foreground">{selectedProjectName}</p>
          )}
        </div>

        <Select
          value={projectId}
          onValueChange={setProjectId}
          disabled={loadingProjects || projects.length === 0}
        >
          <SelectTrigger className="h-8 w-[220px] text-sm">
            <SelectValue
              placeholder={
                loadingProjects ? "Loading…" : projects.length === 0 ? "No projects" : "Select project"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {projectId ? (
        <BoqTrackerShell projectId={projectId} />
      ) : (
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
          Select a project above to view the BOQ tracker.
        </div>
      )}
    </div>
  );
}
