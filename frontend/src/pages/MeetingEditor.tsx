import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingsApi, type MeetingInput } from "../api/meetings";
import { teamMembersApi } from "../api/teamMembers";
import { actionItemsApi } from "../api/actionItems";
import { reportsApi } from "../api/reports";
import { whiteboardsApi } from "../api/whiteboards";
import JiraTaskBoard from "../components/JiraTaskBoard";
import ActionItemsList from "../components/ActionItemsList";
import NotificationModal, { type NotificationModalConfig } from "../components/NotificationModal";
import type { ActionItem, JiraIssue } from "../api/types";

export default function MeetingEditor() {
  const { meetingId } = useParams();
  const id = Number(meetingId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: meeting, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => meetingsApi.get(id),
    enabled: !Number.isNaN(id),
  });
  const { data: teamMembers = [] } = useQuery({ queryKey: ["team-members"], queryFn: teamMembersApi.list });
  const { data: reports = [] } = useQuery({
    queryKey: ["reports", id],
    queryFn: () => reportsApi.listForMeeting(id),
    enabled: !Number.isNaN(id),
  });
  const { data: whiteboards = [] } = useQuery({
    queryKey: ["whiteboards", "meeting", id],
    queryFn: () => whiteboardsApi.list(id),
    enabled: !Number.isNaN(id),
  });

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<number[]>([]);
  const [rawNotes, setRawNotes] = useState("");
  const [notificationConfig, setNotificationConfig] = useState<NotificationModalConfig | null>(null);

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDate(meeting.meeting_date);
      setAttendeeIds(meeting.attendees.map((a) => a.id));
      setRawNotes(meeting.raw_notes ?? "");
    }
  }, [meeting]);

  const saveMutation = useMutation({
    mutationFn: (input: MeetingInput) => meetingsApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  const summarizeMutation = useMutation({
    mutationFn: () => meetingsApi.summarize(id, rawNotes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  const generateReportMutation = useMutation({
    mutationFn: () => reportsApi.generate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports", id] }),
  });

  const createWhiteboardMutation = useMutation({
    mutationFn: () => whiteboardsApi.create(`${meeting?.title ?? "Meeting"} - Architecture`, id),
    onSuccess: (board) => navigate(`/whiteboards/${board.id}`),
  });

  const createActionItemFromJira = useMutation({
    mutationFn: (issue: JiraIssue) =>
      actionItemsApi.create(id, {
        description: issue.summary ?? issue.key ?? "JIRA task",
        jira_issue_key: issue.key,
        jira_issue_summary: issue.summary,
        status: "open",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["action-items", id] }),
  });

  function handleSave() {
    saveMutation.mutate({ title, meeting_date: date, raw_notes: rawNotes, attendee_ids: attendeeIds });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over, active } = event;
    if (over?.id === "action-items-dropzone") {
      const issue = active.data.current?.issue as JiraIssue | undefined;
      if (issue) createActionItemFromJira.mutate(issue);
    }
  }

  function toggleAttendee(memberId: number) {
    setAttendeeIds((prev) =>
      prev.includes(memberId) ? prev.filter((i) => i !== memberId) : [...prev, memberId],
    );
  }

  function openRemindModal(item: ActionItem) {
    setNotificationConfig({
      teamMembers,
      defaultTeamMemberId: item.assignee?.id ?? null,
      defaultSubject: `Reminder: ${item.description}`,
      defaultMessage: `Hey${item.assignee ? " " + item.assignee.name.split(" ")[0] : ""}, just a reminder about your action item from "${meeting?.title}": ${item.description}${item.due_date ? ` (due ${item.due_date})` : ""}.`,
      relatedMeetingId: id,
      relatedActionItemId: item.id,
      title: "Remind about action item",
    });
  }

  function openShareModal(reportId: number) {
    setNotificationConfig({
      teamMembers,
      defaultSubject: `Meeting summary: ${meeting?.title}`,
      defaultMessage: `Hi, sharing the executive summary for "${meeting?.title}" (${meeting?.meeting_date}).`,
      attachReportId: reportId,
      relatedMeetingId: id,
      title: "Share report",
    });
  }

  if (Number.isNaN(id)) return <p className="p-8 text-red-600">Invalid meeting id</p>;
  if (isLoading || !meeting) return <p className="p-8 text-slate-400">Loading meeting...</p>;

  const summary = meeting.ai_summary;

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate("/meetings")} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to meetings
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1.4fr_1.2fr]">
          {/* Minutes column */}
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mb-3 w-full border-b border-slate-200 pb-2 text-xl font-semibold text-slate-900 focus:outline-none"
              />
              <div className="mb-3 flex items-center gap-3">
                <label className="text-xs font-medium text-slate-500">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="mb-1 text-xs font-medium text-slate-500">Attendees</div>
              <div className="mb-3 flex flex-wrap gap-2">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleAttendee(member.id)}
                    className={
                      attendeeIds.includes(member.id)
                        ? "rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500"
                    }
                  >
                    {member.name}
                  </button>
                ))}
                {teamMembers.length === 0 && (
                  <p className="text-xs text-slate-400">Add team members first from the Team page.</p>
                )}
              </div>

              <label className="mb-1 block text-xs font-medium text-slate-500">Raw notes</label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                rows={10}
                placeholder="Paste or type your raw meeting notes here..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => summarizeMutation.mutate()}
                disabled={summarizeMutation.isPending || !rawNotes.trim()}
                className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {summarizeMutation.isPending ? "Generating..." : "✨ Generate AI Summary"}
              </button>
              {summarizeMutation.isError && (
                <p className="mt-2 text-xs text-red-600">
                  {(summarizeMutation.error as any)?.response?.data?.detail ?? "Failed to summarize"}
                </p>
              )}
            </div>

            {summary && (
              <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800">AI-Generated Summary</h3>
                <SummarySection title="Key Decisions" items={summary.key_decisions} />
                <SummarySection title="Discussion Highlights" items={summary.discussion_highlights} />
                <SummarySection title="Risks / Blockers" items={summary.risks_or_blockers} tone="risk" />
                <SummarySection title="Next Steps" items={summary.next_steps} />
                {summary.suggested_action_items && summary.suggested_action_items.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Suggested Action Items</p>
                    <ul className="space-y-1">
                      {summary.suggested_action_items.map((s, i) => (
                        <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span>
                            {s.description} {s.owner && <span className="text-slate-400">— {s.owner}</span>}
                          </span>
                          <button
                            onClick={() =>
                              createActionItemFromJira.mutate({
                                key: null,
                                summary: s.description,
                                status: null,
                                priority: null,
                                issue_type: null,
                                assignee_name: null,
                                assignee_account_id: null,
                                due_date: null,
                                url: null,
                              })
                            }
                            className="text-xs font-semibold text-brand-600 hover:underline"
                          >
                            + Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Executive Report (one-slide PDF)</h3>
                <button
                  onClick={() => generateReportMutation.mutate()}
                  disabled={generateReportMutation.isPending}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {generateReportMutation.isPending ? "Generating..." : "Generate Report"}
                </button>
              </div>
              {generateReportMutation.isError && (
                <p className="mb-2 text-xs text-red-600">
                  {(generateReportMutation.error as any)?.response?.data?.detail ?? "Failed to generate report"}
                </p>
              )}
              {reports.length === 0 && <p className="text-xs text-slate-400">No reports generated yet.</p>}
              <ul className="space-y-2">
                {reports.map((report) => (
                  <li key={report.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600">
                      {report.ai_content?.headline ?? `Report #${report.id}`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => reportsApi.download(report.id, `${meeting.title}-report.pdf`)}
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => openShareModal(report.id)}
                        className="text-xs font-semibold text-slate-600 hover:underline"
                      >
                        Share
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Architecture Whiteboards</h3>
                <button
                  onClick={() => createWhiteboardMutation.mutate()}
                  disabled={createWhiteboardMutation.isPending}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  + New Whiteboard
                </button>
              </div>
              {whiteboards.length === 0 && (
                <p className="text-xs text-slate-400">
                  No whiteboards linked yet. Sketch an architecture during this meeting and share your screen.
                </p>
              )}
              <ul className="space-y-2">
                {whiteboards.map((wb) => (
                  <li key={wb.id}>
                    <button
                      onClick={() => navigate(`/whiteboards/${wb.id}`)}
                      className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      {wb.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action items column */}
          <div className="min-h-[600px]">
            <ActionItemsList meetingId={id} teamMembers={teamMembers} onRemind={openRemindModal} />
          </div>

          {/* Jira column */}
          <div className="min-h-[600px]">
            <JiraTaskBoard />
          </div>
        </div>

        {notificationConfig && (
          <NotificationModal config={notificationConfig} onClose={() => setNotificationConfig(null)} />
        )}
      </div>
    </DndContext>
  );
}

function SummarySection({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone?: "risk";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-slate-400">{title}</p>
      <ul className={`list-disc space-y-1 pl-5 text-sm ${tone === "risk" ? "text-red-600" : "text-slate-700"}`}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
