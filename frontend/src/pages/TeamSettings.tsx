import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jiraApi } from "../api/jira";
import { teamMembersApi } from "../api/teamMembers";
import type { JiraUser, TeamMember, TeamMemberInput } from "../api/types";

const emptyForm: TeamMemberInput = { name: "", email: "", slack_user_id: "", jira_account_id: "" };

export default function TeamSettings() {
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useQuery({ queryKey: ["team-members"], queryFn: teamMembersApi.list });
  const [form, setForm] = useState<TeamMemberInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jiraMatches, setJiraMatches] = useState<JiraUser[] | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["team-members"] });

  const lookupMutation = useMutation({
    mutationFn: (query: string) => jiraApi.searchUsers(query),
    onSuccess: (users) => {
      setJiraMatches(users);
      if (users.length === 1 && users[0].account_id) {
        setForm((prev) => ({ ...prev, jira_account_id: users[0].account_id }));
        setJiraMatches(null);
      }
    },
    onError: (err: any) =>
      setError(err?.response?.data?.detail ?? "Could not search JIRA. Is JIRA connected?"),
  });

  function lookupJiraAccount() {
    const query = form.email.trim() || form.name.trim();
    if (!query) {
      setError("Enter a name or email first, then look up the JIRA account.");
      return;
    }
    setError(null);
    setJiraMatches(null);
    lookupMutation.mutate(query);
  }

  const createMutation = useMutation({
    mutationFn: teamMembersApi.create,
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? "Failed to save team member"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TeamMemberInput }) => teamMembersApi.update(id, input),
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? "Failed to update team member"),
  });

  const deleteMutation = useMutation({
    mutationFn: teamMembersApi.remove,
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const input: TeamMemberInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      slack_user_id: form.slack_user_id?.trim() || null,
      jira_account_id: form.jira_account_id?.trim() || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      slack_user_id: member.slack_user_id ?? "",
      jira_account_id: member.jira_account_id ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setJiraMatches(null);
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Team Directory</h1>
      <p className="mb-6 text-sm text-slate-500">
        Add your team members here so you can pick attendees, assign action items, and send Slack/email
        reminders. Slack User ID and JIRA Account ID are optional but required for notifications and
        team-task lookups respectively. Once JIRA is connected, use "Look up in JIRA" to fill the account
        ID automatically.
      </p>

      <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-2 gap-4 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
          <input
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
          <input
            required
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Slack User ID (optional)</label>
          <input
            placeholder="U0123ABCD"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.slack_user_id ?? ""}
            onChange={(e) => setForm({ ...form, slack_user_id: e.target.value })}
          />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="block text-xs font-medium text-slate-600">JIRA Account ID (optional)</label>
            <button
              type="button"
              onClick={lookupJiraAccount}
              disabled={lookupMutation.isPending}
              className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-60"
            >
              {lookupMutation.isPending ? "Searching..." : "Look up in JIRA"}
            </button>
          </div>
          <input
            placeholder="712020:xxxxxxxx"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.jira_account_id ?? ""}
            onChange={(e) => setForm({ ...form, jira_account_id: e.target.value })}
          />
          {jiraMatches && jiraMatches.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No matching JIRA user found.</p>
          )}
          {jiraMatches && jiraMatches.length > 0 && (
            <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {jiraMatches.map((user) => (
                <li key={user.account_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, jira_account_id: user.account_id });
                      setJiraMatches(null);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">{user.display_name}</span>
                    {user.email && <span className="ml-1 text-slate-400">{user.email}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <div className="col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {editingId ? "Save changes" : "Add team member"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Slack</th>
              <th className="px-4 py-3">JIRA</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={5}>
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && members?.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={5}>
                  No team members yet. Add your first one above.
                </td>
              </tr>
            )}
            {members?.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{member.name}</td>
                <td className="px-4 py-3 text-slate-600">{member.email}</td>
                <td className="px-4 py-3 text-slate-500">{member.slack_user_id || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{member.jira_account_id || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(member)}
                    className="mr-3 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(member.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
