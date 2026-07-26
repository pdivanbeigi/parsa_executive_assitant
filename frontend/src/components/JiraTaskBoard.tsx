import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { jiraApi } from "../api/jira";
import JiraTaskCard from "./JiraTaskCard";

export default function JiraTaskBoard() {
  const [scope, setScope] = useState<"mine" | "team">("mine");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["jira-tasks", scope],
    queryFn: () => jiraApi.getTasks(scope),
    retry: false,
  });

  return (
    <div className="flex h-full flex-col rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">JIRA Tasks</h2>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            onClick={() => setScope("mine")}
            className={clsx("rounded-md px-3 py-1", scope === "mine" ? "bg-white shadow-sm" : "text-slate-500")}
          >
            My Tasks
          </button>
          <button
            onClick={() => setScope("team")}
            className={clsx("rounded-md px-3 py-1", scope === "team" ? "bg-white shadow-sm" : "text-slate-500")}
          >
            Team Tasks
          </button>
        </div>
      </div>
      <p className="border-b border-slate-100 px-4 py-2 text-[11px] text-slate-400">
        Drag a task into Action Items to link it to this meeting.
      </p>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && <p className="p-2 text-sm text-slate-400">Loading tasks...</p>}
        {isError && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            <p>
              {(error as any)?.response?.data?.detail ??
                "Could not load JIRA tasks. Check your JIRA connection."}
            </p>
            <Link to="/integrations" className="mt-2 inline-block font-semibold underline">
              Connect JIRA
            </Link>
          </div>
        )}
        {!isLoading && !isError && data?.length === 0 && (
          <p className="p-2 text-sm text-slate-400">No open tasks found.</p>
        )}
        {data?.map((issue) => <JiraTaskCard key={issue.key} issue={issue} />)}
      </div>
    </div>
  );
}
