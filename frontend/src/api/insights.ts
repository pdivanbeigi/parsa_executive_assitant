import { apiClient } from "./client";
import type { InsightSummary } from "./types";

export const insightsApi = {
  getSummary: async (): Promise<InsightSummary> => (await apiClient.get("/insights/summary")).data,
};
