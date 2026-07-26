import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications";
import type { TeamMember } from "../api/types";

export interface NotificationModalConfig {
  teamMembers: TeamMember[];
  defaultTeamMemberId?: number | null;
  defaultSubject?: string;
  defaultMessage?: string;
  attachReportId?: number | null;
  relatedMeetingId?: number | null;
  relatedActionItemId?: number | null;
  title?: string;
}

export default function NotificationModal({
  config,
  onClose,
}: {
  config: NotificationModalConfig;
  onClose: () => void;
}) {
  const [teamMemberId, setTeamMemberId] = useState<number | "">(config.defaultTeamMemberId ?? "");
  const [channels, setChannels] = useState<{ slack: boolean; email: boolean }>({ slack: true, email: false });
  const [subject, setSubject] = useState(config.defaultSubject ?? "");
  const [message, setMessage] = useState(config.defaultMessage ?? "");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    setTeamMemberId(config.defaultTeamMemberId ?? "");
    setSubject(config.defaultSubject ?? "");
    setMessage(config.defaultMessage ?? "");
    setResult(null);
  }, [config]);

  const slackMutation = useMutation({ mutationFn: notificationsApi.sendSlack });
  const emailMutation = useMutation({ mutationFn: notificationsApi.sendEmail });

  const selectedMember = config.teamMembers.find((m) => m.id === teamMemberId);

  async function handleSend() {
    setResult(null);
    const errors: string[] = [];
    const successes: string[] = [];

    if (channels.slack) {
      try {
        await slackMutation.mutateAsync({
          team_member_id: teamMemberId || null,
          message,
          related_meeting_id: config.relatedMeetingId ?? null,
          related_action_item_id: config.relatedActionItemId ?? null,
        });
        successes.push("Slack");
      } catch (err: any) {
        errors.push(`Slack: ${err?.response?.data?.detail ?? "failed to send"}`);
      }
    }

    if (channels.email) {
      try {
        await emailMutation.mutateAsync({
          team_member_id: teamMemberId || null,
          subject,
          body: message,
          attach_report_id: config.attachReportId ?? null,
          related_meeting_id: config.relatedMeetingId ?? null,
          related_action_item_id: config.relatedActionItemId ?? null,
        });
        successes.push("Email");
      } catch (err: any) {
        errors.push(`Email: ${err?.response?.data?.detail ?? "failed to send"}`);
      }
    }

    const parts = [];
    if (successes.length) parts.push(`Sent via ${successes.join(" and ")}.`);
    if (errors.length) parts.push(errors.join(" "));
    setResult(parts.join(" ") || "Select at least one channel.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{config.title ?? "Send notification"}</h3>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">Recipient</label>
          <select
            value={teamMemberId}
            onChange={(e) => setTeamMemberId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select a team member</option>
            {config.teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={channels.slack}
              onChange={(e) => setChannels((c) => ({ ...c, slack: e.target.checked }))}
              disabled={!selectedMember?.slack_user_id}
            />
            Slack {selectedMember && !selectedMember.slack_user_id && "(no Slack ID)"}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={channels.email}
              onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))}
            />
            Email
          </label>
        </div>

        {channels.email && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {result && <p className="mb-3 text-sm text-slate-600">{result}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            onClick={handleSend}
            disabled={!teamMemberId || slackMutation.isPending || emailMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
