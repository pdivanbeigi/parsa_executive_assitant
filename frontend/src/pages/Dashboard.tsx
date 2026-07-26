import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { meetingsApi } from "../api/meetings";
import { jiraApi } from "../api/jira";
import { notificationsApi } from "../api/notifications";
import { whiteboardsApi } from "../api/whiteboards";
import TodoWidget from "../components/TodoWidget";

export default function Dashboard() {
  const { data: meetings = [] } = useQuery({ queryKey: ["meetings"], queryFn: meetingsApi.list });
  const { data: myTasks = [], isError: jiraFailed } = useQuery({
    queryKey: ["jira-tasks", "mine"],
    queryFn: () => jiraApi.getTasks("mine"),
    retry: false,
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });
  const { data: whiteboards = [] } = useQuery({ queryKey: ["whiteboards"], queryFn: () => whiteboardsApi.list() });

  const upcomingMeetings = [...meetings]
    .sort((a, b) => (a.meeting_date > b.meeting_date ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">Your meetings, tasks, and recent activity at a glance.</p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recent Meetings</h2>
            <Link to="/meetings" className="text-xs font-semibold text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {upcomingMeetings.length === 0 && <p className="text-sm text-slate-400">No meetings yet.</p>}
          <ul className="space-y-2">
            {upcomingMeetings.map((m) => (
              <li key={m.id}>
                <Link to={`/meetings/${m.id}`} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  <span className="font-medium text-slate-800">{m.title}</span>
                  <span className="ml-2 text-xs text-slate-400">{m.meeting_date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">My Open JIRA Tasks</h2>
          {jiraFailed && (
            <p className="text-sm text-slate-500">
              JIRA isn't connected yet.{" "}
              <Link to="/integrations" className="font-semibold text-brand-600 hover:underline">
                Sign in with Atlassian
              </Link>
            </p>
          )}
          {!jiraFailed && myTasks.length === 0 && (
            <p className="text-sm text-slate-400">No open tasks.</p>
          )}
          <ul className="space-y-2">
            {myTasks.slice(0, 6).map((task) => (
              <li key={task.key} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-brand-600">{task.key}</span>{" "}
                <span className="text-slate-700">{task.summary}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Whiteboards</h2>
            <Link to="/whiteboards" className="text-xs font-semibold text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {whiteboards.length === 0 && <p className="text-sm text-slate-400">No whiteboards yet.</p>}
          <ul className="space-y-2">
            {whiteboards.slice(0, 5).map((wb) => (
              <li key={wb.id}>
                <Link to={`/whiteboards/${wb.id}`} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  {wb.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <TodoWidget />

        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Recent Notifications</h2>
          {notifications.length === 0 && <p className="text-sm text-slate-400">No notifications sent yet.</p>}
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-1 pr-4">Type</th>
                <th className="py-1 pr-4">Recipient</th>
                <th className="py-1 pr-4">Subject</th>
                <th className="py-1 pr-4">Status</th>
                <th className="py-1">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notifications.slice(0, 10).map((n) => (
                <tr key={n.id}>
                  <td className="py-2 pr-4 capitalize">{n.type}</td>
                  <td className="py-2 pr-4">{n.recipient}</td>
                  <td className="py-2 pr-4 text-slate-500">{n.subject ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        n.status === "sent"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                          : "rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
                      }
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-400">{new Date(n.sent_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
