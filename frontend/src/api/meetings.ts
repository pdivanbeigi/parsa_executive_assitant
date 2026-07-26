import { apiClient } from "./client";
import type { Meeting } from "./types";

export interface MeetingInput {
  title: string;
  meeting_date: string;
  raw_notes?: string | null;
  attendee_ids: number[];
  status?: string;
}

export const meetingsApi = {
  list: async (): Promise<Meeting[]> => (await apiClient.get("/meetings")).data,
  get: async (id: number): Promise<Meeting> => (await apiClient.get(`/meetings/${id}`)).data,
  create: async (input: MeetingInput): Promise<Meeting> => (await apiClient.post("/meetings", input)).data,
  update: async (id: number, input: MeetingInput): Promise<Meeting> =>
    (await apiClient.put(`/meetings/${id}`, input)).data,
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`);
  },
  summarize: async (id: number, rawNotes?: string): Promise<Meeting> =>
    (await apiClient.post(`/meetings/${id}/summarize`, { raw_notes: rawNotes })).data,
};
