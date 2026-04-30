import axios from "axios";
import type {
  AiConfigDTO,
  AnalysisRunDTO,
  AppendImportResponse,
  DashboardDTO,
  ImportTaskResponse,
  ReviewRowDTO,
  TaskListItem
} from "@review-ai/shared";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
});

export async function fetchTasks() {
  const { data } = await api.get<TaskListItem[]>("/tasks");
  return data;
}

export async function importTask(payload: {
  name: string;
  productName: string;
  sourceChannel: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("productName", payload.productName);
  formData.append("sourceChannel", payload.sourceChannel);
  formData.append("file", payload.file);
  const { data } = await api.post<ImportTaskResponse>("/tasks/import", formData);
  return data;
}

export async function appendImport(taskId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<AppendImportResponse>(`/tasks/${taskId}/import`, formData);
  return data;
}

export async function fetchTask(taskId: string): Promise<TaskListItem> {
  const { data } = await api.get<{ task: TaskListItem }>(`/tasks/${taskId}`);
  return data.task;
}

export async function updateTask(
  taskId: string,
  payload: { name?: string; productName?: string; sourceChannel?: string }
) {
  const { data } = await api.patch<TaskListItem>(`/tasks/${taskId}`, payload);
  return data;
}

export async function deleteTask(taskId: string) {
  await api.delete(`/tasks/${taskId}`);
}

export async function fetchDashboard(taskId: string) {
  const { data } = await api.get<DashboardDTO>(`/tasks/${taskId}/dashboard`);
  return data;
}

export async function fetchReviews(taskId: string, params: Record<string, string | number | boolean | undefined>) {
  const { data } = await api.get<{ total: number; page: number; pageSize: number; items: ReviewRowDTO[] }>(
    `/tasks/${taskId}/reviews`,
    { params }
  );
  return data;
}

export function buildExportUrl(taskId: string, params: Record<string, string | number | boolean | undefined>) {
  const base = (import.meta.env.VITE_API_BASE_URL || "/api") as string;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) {
      query.set(k, String(v));
    }
  }
  return `${base}/tasks/${taskId}/export?${query.toString()}`;
}

export async function createRun(taskId: string) {
  const { data } = await api.post<AnalysisRunDTO>(`/tasks/${taskId}/analysis-runs`, {
    promptVersion: "v2-thai"
  });
  return data;
}

export async function fetchRuns(taskId: string) {
  const { data } = await api.get<AnalysisRunDTO[]>(`/tasks/${taskId}/analysis-runs`);
  return data;
}

export async function cancelRun(taskId: string, runId: string) {
  const { data } = await api.patch<AnalysisRunDTO>(
    `/tasks/${taskId}/analysis-runs/${runId}`,
    { action: "cancel" }
  );
  return data;
}

export async function fetchAiConfig() {
  const { data } = await api.get<AiConfigDTO>("/settings/ai");
  return data;
}

export async function updateAiConfig(payload: {
  provider?: string;
  apiKey?: string;
  baseUrl?: string | null;
  modelName?: string;
  reviewPrompt?: string;
  summaryPrompt?: string;
  insightsPrompt?: string;
}) {
  const { data } = await api.put<AiConfigDTO>("/settings/ai", payload);
  return data;
}
