import { apiClient } from "./client";
import type { Report } from "./types";

export const reportsApi = {
  listForMeeting: async (meetingId: number): Promise<Report[]> =>
    (await apiClient.get(`/meetings/${meetingId}/reports`)).data,
  generate: async (meetingId: number): Promise<Report> =>
    (await apiClient.post(`/meetings/${meetingId}/report`)).data,
  download: async (reportId: number, filename: string): Promise<void> => {
    const response = await apiClient.get(`/reports/${reportId}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
