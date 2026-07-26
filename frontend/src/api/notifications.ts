import { apiClient } from "./client";
import type { NotificationLog } from "./types";

export interface SlackNotificationInput {
  team_member_id?: number | null;
  channel?: string | null;
  message: string;
  related_meeting_id?: number | null;
  related_action_item_id?: number | null;
}

export interface EmailNotificationInput {
  team_member_id?: number | null;
  email?: string | null;
  subject: string;
  body: string;
  attach_report_id?: number | null;
  related_meeting_id?: number | null;
  related_action_item_id?: number | null;
}

export const notificationsApi = {
  list: async (): Promise<NotificationLog[]> => (await apiClient.get("/notifications")).data,
  sendSlack: async (input: SlackNotificationInput): Promise<NotificationLog> =>
    (await apiClient.post("/notifications/slack", input)).data,
  sendEmail: async (input: EmailNotificationInput): Promise<NotificationLog> =>
    (await apiClient.post("/notifications/email", input)).data,
};
