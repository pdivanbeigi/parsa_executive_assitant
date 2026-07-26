import { apiClient } from "./client";
import type { Whiteboard, WhiteboardDetail } from "./types";

export const whiteboardsApi = {
  list: async (meetingId?: number): Promise<Whiteboard[]> =>
    (await apiClient.get("/whiteboards", { params: meetingId ? { meeting_id: meetingId } : undefined })).data,
  get: async (id: number): Promise<WhiteboardDetail> => (await apiClient.get(`/whiteboards/${id}`)).data,
  create: async (title: string, meetingId?: number | null): Promise<WhiteboardDetail> =>
    (await apiClient.post("/whiteboards", { title, meeting_id: meetingId ?? null })).data,
  update: async (id: number, title: string, data: WhiteboardDetail["data"]): Promise<WhiteboardDetail> =>
    (await apiClient.put(`/whiteboards/${id}`, { title, data })).data,
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/whiteboards/${id}`);
  },
};
