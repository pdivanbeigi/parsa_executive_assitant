import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "../api/meetings";

export default function MeetingList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: meetings, isLoading } = useQuery({ queryKey: ["meetings"], queryFn: meetingsApi.list });

  const createMutation = useMutation({
    mutationFn: () =>
      meetingsApi.create({
        title: "Untitled Meeting",
        meeting_date: new Date().toISOString().slice(0, 10),
        attendee_ids: [],
      }),
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      navigate(`/meetings/${meeting.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Meetings</h1>
          <p className="text-sm text-slate-500">Meeting minutes, action items, and executive reports.</p>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          + New Meeting
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading && <p className="p-6 text-sm text-slate-400">Loading...</p>}
        {!isLoading && meetings?.length === 0 && (
          <p className="p-6 text-sm text-slate-400">No meetings yet. Create your first one.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {meetings?.map((meeting) => (
            <li
              key={meeting.id}
              onClick={() => navigate(`/meetings/${meeting.id}`)}
              className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-800">{meeting.title}</p>
                <p className="text-xs text-slate-400">
                  {meeting.meeting_date} &middot; {meeting.attendees.length} attendee
                  {meeting.attendees.length === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={
                  meeting.status === "finalized"
                    ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                    : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500"
                }
              >
                {meeting.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
