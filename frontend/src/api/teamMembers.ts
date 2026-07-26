import { apiClient } from "./client";
import type { TeamMember, TeamMemberInput } from "./types";

export const teamMembersApi = {
  list: async (): Promise<TeamMember[]> => (await apiClient.get("/team-members")).data,
  create: async (input: TeamMemberInput): Promise<TeamMember> =>
    (await apiClient.post("/team-members", input)).data,
  update: async (id: number, input: TeamMemberInput): Promise<TeamMember> =>
    (await apiClient.put(`/team-members/${id}`, input)).data,
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/team-members/${id}`);
  },
};
