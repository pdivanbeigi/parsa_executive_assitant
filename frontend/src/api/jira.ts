import { apiClient } from "./client";
import type { JiraConnection, JiraIssue, JiraUser } from "./types";

export const jiraApi = {
  getTasks: async (scope: "mine" | "team"): Promise<JiraIssue[]> =>
    (await apiClient.get("/jira/tasks", { params: { scope } })).data,

  getConnection: async (): Promise<JiraConnection> => (await apiClient.get("/jira/connection")).data,

  getAuthorizeUrl: async (): Promise<string> =>
    (await apiClient.get("/jira/connection/authorize-url")).data.authorize_url,

  disconnect: async (): Promise<void> => {
    await apiClient.delete("/jira/connection");
  },

  searchUsers: async (query: string): Promise<JiraUser[]> =>
    (await apiClient.get("/jira/users/search", { params: { query } })).data,
};
