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

  useEffect(() => {
    fetch("/api/projects/list")
      .then((res) => res.json())
      .then((json) => {
        const list = json.success ? (json.data?.projects ?? []) : [];
        setProjects(list);
        if (list.length > 0) {
          setProjectId((current) => current || list[0].id);
        }
      })
      .finally(() => setLoadingProjects(false));
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
