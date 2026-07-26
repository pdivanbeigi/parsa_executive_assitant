import { apiClient } from "./client";
import type { StatusSlide, StatusSlideInput, SlideTheme } from "./types";

export const statusSlidesApi = {
  list: async (): Promise<StatusSlide[]> => (await apiClient.get("/status-slides")).data,

  create: async (input: StatusSlideInput): Promise<StatusSlide> =>
    (await apiClient.post("/status-slides", input)).data,

  update: async (id: number, input: Partial<StatusSlideInput>): Promise<StatusSlide> =>
    (await apiClient.put(`/status-slides/${id}`, input)).data,

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/status-slides/${id}`);
  },

  exportPdf: async (id: number): Promise<StatusSlide> =>
    (await apiClient.post(`/status-slides/${id}/export`)).data,

  download: async (id: number, filename: string): Promise<void> => {
    const response = await apiClient.get(`/status-slides/${id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  previewExport: async (input: StatusSlideInput, filename: string): Promise<void> => {
    const response = await apiClient.post("/status-slides/preview-export", input, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export type { StatusSlide, StatusSlideInput, SlideTheme };
