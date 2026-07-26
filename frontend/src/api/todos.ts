import { apiClient } from "./client";
import type { Todo, TodoCreateInput, TodoUpdateInput } from "./types";

export const todosApi = {
  list: async (includeCompleted = true): Promise<Todo[]> =>
    (await apiClient.get("/todos", { params: { include_completed: includeCompleted } })).data,
  create: async (input: TodoCreateInput): Promise<Todo> => (await apiClient.post("/todos", input)).data,
  update: async (id: number, input: TodoUpdateInput): Promise<Todo> =>
    (await apiClient.patch(`/todos/${id}`, input)).data,
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/todos/${id}`);
  },
};
