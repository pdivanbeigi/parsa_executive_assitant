import { apiClient } from "./client";
import type { ActionItem } from "./types";

export interface ActionItemInput {
  description: string;
  assignee_id?: number | null;
  due_date?: string | null;
  status?: string;
  jira_issue_key?: string | null;
  jira_issue_summary?: string | null;
}

export const actionItemsApi = {
  list: async (meetingId: number): Promise<ActionItem[]> =>
    (await apiClient.get(`/meetings/${meetingId}/action-items`)).data,
  create: async (meetingId: number, input: ActionItemInput): Promise<ActionItem> =>
    (await apiClient.post(`/meetings/${meetingId}/action-items`, input)).data,
  update: async (itemId: number, input: ActionItemInput): Promise<ActionItem> =>
    (await apiClient.put(`/action-items/${itemId}`, input)).data,
  remove: async (itemId: number): Promise<void> => {
    await apiClient.delete(`/action-items/${itemId}`);
  },
};
