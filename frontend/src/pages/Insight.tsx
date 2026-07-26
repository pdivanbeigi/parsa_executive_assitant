import { useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";
import { insightsApi } from "../api/insights";
import type { InsightSummary } from "../api/types";
import StatusSlideBuilder from "../components/StatusSlideBuilder";

type SectionKey =
  | "kpis"
  | "actionStatus"
  | "workload"
  | "todoPriority"
  | "meetingsTrend"
  | "openActions"
  | "openTodos";

const SECTIONS: { key: SectionKey; label: string; description: string }[] = [
  { key: "kpis", label: "KPI strip", description: "Meetings, open work, overdue counts" },
  { key: "actionStatus", label: "Action item status", description: "Open / in progress / done" },
  { key: "workload", label: "Workload by owner", description: "Open action items per person" },
  { key: "todoPriority", label: "To-do priority", description: "Open to-dos by priority" },
  { key: "meetingsTrend", label: "Meetings over time", description: "Meetings by month" },
  { key: "openActions", label: "Open action items", description: "Detailed open action list" },
  { key: "openTodos", label: "Open to-dos", description: "Detailed open to-do list" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "#5b8cff",
  in_progress: "#f59e0b",
  done: "#10b981",
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#94a3b8",
  completed: "#10b981",
};

const CHART_BLUE = "#1f45f0";
const CHART_TEAL = "#0d9488";

function prettyLabel(label: string) {
  return label.replaceAll("_", " ");
}

export default function Insight() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"charts" | "slide">("slide");
  const [title, setTitle] = useState("Executive Insight Report");
  const [enabled, setEnabled] = useState<Record<SectionKey, boolean>>({
    kpis: true,
    actionStatus: true,
    workload: true,
    todoPriority: true,
    meetingsTrend: true,
    openActions: true,
    openTodos: false,
  });
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["insights-summary"],
    queryFn: insightsApi.getSummary,
  });

  const activeSections = useMemo(
    () => SECTIONS.filter((section) => enabled[section.key]),
    [enabled],
  );

  function toggleSection(key: SectionKey) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function exportPng() {
    if (!reportRef.current) return;
    setError(null);
    setExporting("png");
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${slugify(title)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export PNG.");
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    if (!reportRef.current) return;
    setError(null);
    setExporting("pdf");
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
      if (!printWindow) {
        throw new Error("Pop-up blocked. Allow pop-ups to export PDF.");
      }
      printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 12mm; size: landscape; }
      body { margin: 0; font-family: system-ui, sans-serif; }
      img { width: 100%; height: auto; display: block; }
      h1 { font-size: 16px; margin: 0 0 12px; color: #1a1d29; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <img src="${dataUrl}" alt="Insight report" />
    <script>
      const img = document.querySelector("img");
      img.onload = () => { window.focus(); window.print(); };
    <\/script>
  </body>
</html>`);
      printWindow.document.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export PDF.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">Insight</h1>
          <p className="text-sm text-slate-500">
            Build a one-page status slide or compose chart-based visual reports, then export.
          </p>
          <div className="mt-3 inline-flex rounded-lg bg-slate-200/80 p-0.5 text-sm font-medium">
            <button
              onClick={() => setMode("slide")}
              className={clsx(
                "rounded-md px-3 py-1.5",
                mode === "slide" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
              )}
            >
              Status Slide
            </button>
            <button
              onClick={() => setMode("charts")}
              className={clsx(
                "rounded-md px-3 py-1.5",
                mode === "charts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
              )}
            >
              Charts
            </button>
          </div>
        </div>
        {mode === "charts" && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {isFetching ? "Refreshing..." : "Refresh data"}
            </button>
            <button
              onClick={exportPng}
              disabled={!data || !!exporting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {exporting === "png" ? "Exporting..." : "Export PNG"}
            </button>
            <button
              onClick={exportPdf}
              disabled={!data || !!exporting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {exporting === "pdf" ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        )}
      </div>

      {mode === "slide" && <StatusSlideBuilder />}

      {mode === "charts" && error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {mode === "charts" && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <label className="mb-1 block text-xs font-medium text-slate-600">Report title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">Sections</h2>
            <p className="mb-3 text-xs text-slate-400">Choose what appears in the exported report.</p>
            <ul className="space-y-2">
              {SECTIONS.map((section) => (
                <li key={section.key}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={enabled[section.key]}
                      onChange={() => toggleSection(section.key)}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{section.label}</span>
                      <span className="block text-xs text-slate-400">{section.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="min-w-0">
          {isLoading && (
            <div className="rounded-xl bg-white p-8 text-sm text-slate-400 shadow-sm">
              Loading insight data...
            </div>
          )}
          {isError && (
            <div className="rounded-xl bg-amber-50 p-5 text-sm text-amber-800">
              Could not load insight data. Make sure the backend is running, then refresh.
            </div>
          )}
          {data && (
            <div
              ref={reportRef}
              className="space-y-5 rounded-xl bg-white p-6 shadow-sm"
            >
              <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Exec Assistant · Insight
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{title || "Untitled report"}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Generated {data.generated_on} · {activeSections.length} section
                  {activeSections.length === 1 ? "" : "s"}
                </p>
              </div>

              {enabled.kpis && <KpiStrip data={data} />}
              {enabled.actionStatus && (
                <ChartCard title="Action items by status">
                  <StatusPie data={data.action_items_by_status} />
                </ChartCard>
              )}
              {enabled.workload && (
                <ChartCard title="Open action items by owner">
                  <HorizontalBars data={data.action_items_by_assignee} color={CHART_BLUE} empty="No open action items assigned yet." />
                </ChartCard>
              )}
              {enabled.todoPriority && (
                <ChartCard title="Open to-dos by priority">
                  <PriorityBars data={data.todos_by_priority} />
                </ChartCard>
              )}
              {enabled.meetingsTrend && (
                <ChartCard title="Meetings over time">
                  <MeetingsLine data={data.meetings_by_month} />
                </ChartCard>
              )}
              {enabled.openActions && (
                <ChartCard title="Open action items">
                  <ActionItemsTable rows={data.open_action_items} />
                </ChartCard>
              )}
              {enabled.openTodos && (
                <ChartCard title="Open to-dos">
                  <TodosTable rows={data.open_todos} />
                </ChartCard>
              )}

              {activeSections.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">
                  Turn on at least one section to build your report.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-100 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

function KpiStrip({ data }: { data: InsightSummary }) {
  const items = [
    { label: "Meetings", value: data.kpis.meetings },
    { label: "Open actions", value: data.kpis.action_items_open },
    { label: "Overdue actions", value: data.kpis.action_items_overdue, warn: data.kpis.action_items_overdue > 0 },
    { label: "Open to-dos", value: data.kpis.todos_open },
    { label: "Overdue to-dos", value: data.kpis.todos_overdue, warn: data.kpis.todos_overdue > 0 },
    { label: "Team", value: data.kpis.team_members },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
          <p
            className={clsx(
              "mt-1 text-2xl font-semibold",
              item.warn ? "text-red-600" : "text-slate-900",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusPie({ data }: { data: InsightSummary["action_items_by_status"] }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return <EmptyState text="No action items yet." />;
  }
  const chartData = data.map((row) => ({ name: prettyLabel(row.label), value: row.count, key: row.label }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? CHART_BLUE} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBars({
  data,
  color,
  empty,
}: {
  data: InsightSummary["action_items_by_assignee"];
  color: string;
  empty: string;
}) {
  if (data.length === 0 || data.every((row) => row.count === 0)) {
    return <EmptyState text={empty} />;
  }
  const chartData = data.map((row) => ({ name: row.label, count: row.count }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PriorityBars({ data }: { data: InsightSummary["todos_by_priority"] }) {
  if (data.every((row) => row.count === 0)) {
    return <EmptyState text="No open to-dos." />;
  }
  const chartData = data.map((row) => ({
    name: prettyLabel(row.label),
    count: row.count,
    fill: STATUS_COLORS[row.label] ?? CHART_TEAL,
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MeetingsLine({ data }: { data: InsightSummary["meetings_by_month"] }) {
  if (data.length === 0) {
    return <EmptyState text="No meetings recorded yet." />;
  }
  const chartData = data.map((row) => ({ month: row.label, meetings: row.count }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="meetings" stroke={CHART_BLUE} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActionItemsTable({ rows }: { rows: InsightSummary["open_action_items"] }) {
  if (rows.length === 0) return <EmptyState text="No open action items." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="pb-2 pr-3">Action</th>
            <th className="pb-2 pr-3">Owner</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-2 pr-3 text-slate-800">{row.description}</td>
              <td className="py-2 pr-3 text-slate-500">{row.assignee ?? "—"}</td>
              <td className="py-2 pr-3 capitalize text-slate-500">{prettyLabel(row.status)}</td>
              <td className={clsx("py-2", row.overdue ? "font-medium text-red-600" : "text-slate-500")}>
                {row.due_date ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TodosTable({ rows }: { rows: InsightSummary["open_todos"] }) {
  if (rows.length === 0) return <EmptyState text="No open to-dos." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="pb-2 pr-3">To-do</th>
            <th className="pb-2 pr-3">Priority</th>
            <th className="pb-2">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-2 pr-3 text-slate-800">{row.title}</td>
              <td className="py-2 pr-3 capitalize text-slate-500">{row.priority}</td>
              <td className={clsx("py-2", row.overdue ? "font-medium text-red-600" : "text-slate-500")}>
                {row.due_date ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-slate-400">{text}</p>;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "insight-report"
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
