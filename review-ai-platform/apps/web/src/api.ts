import axios from "axios";
import type {
  AdminOverviewDTO,
  AdminUserDTO,
  AdminWorkspaceDTO,
  AuditLogDTO,
  AnalysisRunLogDTO,
  AnalysisRunDTO,
  AppendImportResponse,
  AuthResponseDTO,
  CrawlJobDTO,
  CrawlMonitorDTO,
  CreateCrawlJobResponse,
  CreateCrawlMonitorResponse,
  CrawlTaskResponse,
  DashboardDTO,
  DailyBriefDTO,
  ImportTaskResponse,
  InviteCodeDTO,
  AnalysisType,
  MemberRole,
  MyWorkspaceDTO,
  PromptEvalDTO,
  ReportShareDTO,
  ReviewCorrectionDTO,
  ReviewActionItemDTO,
  ReviewRowDTO,
  SavedReviewViewDTO,
  SharedReportDTO,
  StartCrawlAnalysisResponse,
  TaskCompareDTO,
  TaskListItem,
  WorkspaceAiSettingDTO,
  WorkspaceCrawlerSettingDTO,
  WorkspaceDTO,
  WorkspaceMemberDTO,
  CrawlerChannel
} from "@review-ai/shared";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
});

export const AUTH_TOKEN_KEY = "reviewiq:auth-token";
export const WORKSPACE_SLUG_KEY = "reviewiq:workspace-slug";

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const workspaceSlug = window.localStorage.getItem(WORKSPACE_SLUG_KEY);
  if (workspaceSlug) {
    config.headers["X-Workspace-Slug"] = workspaceSlug;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const skipAuthRedirect =
      Boolean(error?.config?.skipAuthRedirect) || window.location.pathname.startsWith("/share/");
    if (error?.response?.status === 401 && !skipAuthRedirect) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(WORKSPACE_SLUG_KEY);
}

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setWorkspaceSlug(slug: string) {
  window.localStorage.setItem(WORKSPACE_SLUG_KEY, slug);
}

export function getWorkspaceSlug() {
  return window.localStorage.getItem(WORKSPACE_SLUG_KEY);
}

function buildFrontendShareUrl(token: string) {
  return `${window.location.origin.replace(/\/$/, "")}/share/${encodeURIComponent(token)}`;
}

function normalizeReportShare(share: ReportShareDTO): ReportShareDTO {
  return {
    ...share,
    shareUrl: buildFrontendShareUrl(share.token)
  };
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<AuthResponseDTO>("/auth/login", payload);
  setAuthToken(data.token);
  setWorkspaceSlug(data.workspace.slug);
  return data;
}

export async function register(payload: { name: string; email: string; password: string; inviteCode: string }) {
  const { data } = await api.post<AuthResponseDTO>("/auth/register", payload);
  setAuthToken(data.token);
  setWorkspaceSlug(data.workspace.slug);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<AuthResponseDTO>("/auth/me");
  setAuthToken(data.token);
  setWorkspaceSlug(data.workspace.slug);
  return data;
}

export async function logout() {
  await api.post("/auth/logout").catch(() => undefined);
  clearAuthToken();
}

export async function changePassword(payload: { oldPassword: string; newPassword: string }) {
  const { data } = await api.patch<{ success: boolean }>("/auth/password", payload);
  return data;
}

export async function fetchTasks() {
  const { data } = await api.get<TaskListItem[]>("/tasks");
  return data;
}

export async function deleteTask(taskId: string) {
  const { data } = await api.delete<{ deleted: boolean }>(`/tasks/${taskId}`);
  return data;
}

export async function fetchWorkspace() {
  const { data } = await api.get<WorkspaceDTO>("/workspace");
  return data;
}

export async function fetchMyWorkspaces() {
  const { data } = await api.get<MyWorkspaceDTO[]>("/workspaces");
  return data;
}

export async function createWorkspace(payload: { name: string; slug?: string }) {
  const { data } = await api.post<MyWorkspaceDTO>("/workspaces", payload);
  setWorkspaceSlug(data.slug);
  return data;
}

export async function deleteWorkspace(workspaceId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/workspaces/${workspaceId}`);
  return data;
}

export async function fetchWorkspaceMembers() {
  const { data } = await api.get<WorkspaceMemberDTO[]>("/workspace/members");
  return data;
}

export async function fetchWorkspaceAiSettings() {
  const { data } = await api.get<WorkspaceAiSettingDTO>("/workspace/ai-settings");
  return data;
}

export async function updateWorkspaceAiSettings(payload: WorkspaceAiSettingDTO) {
  const { data } = await api.patch<WorkspaceAiSettingDTO>("/workspace/ai-settings", payload);
  return data;
}

export async function fetchWorkspaceCrawlerSettings() {
  const { data } = await api.get<WorkspaceCrawlerSettingDTO>("/workspace/crawler-settings");
  return data;
}

export async function updateWorkspaceCrawlerSettings(payload: WorkspaceCrawlerSettingDTO) {
  const { data } = await api.patch<WorkspaceCrawlerSettingDTO>("/workspace/crawler-settings", payload);
  return data;
}

export async function createWorkspaceMember(payload: { email: string; name: string; role: MemberRole }) {
  const { data } = await api.post<WorkspaceMemberDTO>("/workspace/members", payload);
  return data;
}

export async function updateWorkspaceMember(memberId: string, payload: { role: MemberRole }) {
  const { data } = await api.patch<WorkspaceMemberDTO>(`/workspace/members/${memberId}`, payload);
  return data;
}

export async function deleteWorkspaceMember(memberId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/workspace/members/${memberId}`);
  return data;
}

export async function fetchAdminOverview() {
  const { data } = await api.get<AdminOverviewDTO>("/admin/overview");
  return data;
}

export async function fetchAdminUsers() {
  const { data } = await api.get<AdminUserDTO[]>("/admin/users");
  return data;
}

export async function createAdminUser(payload: { email: string; name: string; isSuperAdmin: boolean }) {
  const { data } = await api.post<AdminUserDTO>("/admin/users", payload);
  return data;
}

export async function updateAdminUser(
  userId: string,
  payload: { name?: string; isSuperAdmin?: boolean; isActive?: boolean; monthlyReviewLimit?: number; monthlyRunLimit?: number }
) {
  const { data } = await api.patch<AdminUserDTO>(`/admin/users/${userId}`, payload);
  return data;
}

export async function resetAdminUserPassword(userId: string) {
  const { data } = await api.post<{ password: string }>(`/admin/users/${userId}/reset-password`);
  return data;
}

export async function fetchInviteCodes() {
  const { data } = await api.get<InviteCodeDTO[]>("/admin/invite-codes");
  return data;
}

export async function fetchAdminAuditLogs(params?: { limit?: number }) {
  const { data } = await api.get<AuditLogDTO[]>("/admin/audit-logs", { params });
  return data;
}

export async function createInviteCode(payload: {
  note?: string;
  monthlyReviewLimit: number;
  monthlyRunLimit: number;
  expiresAt?: string | null;
}) {
  const { data } = await api.post<InviteCodeDTO>("/admin/invite-codes", payload);
  return data;
}

export async function fetchAdminWorkspaces() {
  const { data } = await api.get<AdminWorkspaceDTO[]>("/admin/workspaces");
  return data;
}

export async function createAdminWorkspace(payload: {
  name: string;
  slug: string;
  planTier: WorkspaceDTO["planTier"];
  monthlyReviewLimit: number;
  monthlyRunLimit: number;
}) {
  const { data } = await api.post<AdminWorkspaceDTO>("/admin/workspaces", payload);
  return data;
}

export async function importTask(payload: {
  name: string;
  productName: string;
  sourceChannel: string;
  analysisType: AnalysisType;
  file: File;
}) {
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("productName", payload.productName);
  formData.append("sourceChannel", payload.sourceChannel);
  formData.append("analysisType", payload.analysisType);
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

export async function crawlTask(payload: {
  name: string;
  productName?: string;
  sourceChannel: string;
  analysisType: AnalysisType;
  productUrl: string;
  maxReviews: number;
  crawlChannels?: CrawlerChannel[];
}) {
  const { data } = await api.post<CrawlTaskResponse>("/tasks/crawl", payload);
  return data;
}

export async function createCrawlJob(payload: {
  name: string;
  productName?: string;
  sourceChannel: string;
  analysisType: AnalysisType;
  productUrl: string;
  maxReviews: number;
  crawlChannels?: CrawlerChannel[];
}) {
  const { data } = await api.post<CreateCrawlJobResponse>("/crawl-jobs", payload);
  return data.job;
}

export async function fetchCrawlJobs() {
  const { data } = await api.get<CrawlJobDTO[]>("/crawl-jobs");
  return data;
}

export async function fetchCrawlMonitors() {
  const { data } = await api.get<CrawlMonitorDTO[]>("/crawl-monitors");
  return data;
}

export async function createCrawlMonitor(payload: {
  name: string;
  productName?: string;
  sourceChannel: string;
  analysisType: AnalysisType;
  productUrl: string;
  maxReviews: number;
  intervalMinutes: number;
  autoAnalyze: boolean;
}) {
  const { data } = await api.post<CreateCrawlMonitorResponse>("/crawl-monitors", payload);
  return data.monitor;
}

export async function updateCrawlMonitor(
  monitorId: string,
  payload: Partial<{
    name: string;
    productName: string;
    sourceChannel: string;
    analysisType: AnalysisType;
    productUrl: string;
    maxReviews: number;
    intervalMinutes: number;
    autoAnalyze: boolean;
    enabled: boolean;
  }>
) {
  const { data } = await api.patch<CrawlMonitorDTO>(`/crawl-monitors/${monitorId}`, payload);
  return data;
}

export async function runCrawlMonitorNow(monitorId: string) {
  const { data } = await api.post<CrawlMonitorDTO>(`/crawl-monitors/${monitorId}`);
  return data;
}

export async function deleteCrawlMonitor(monitorId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/crawl-monitors/${monitorId}`);
  return data;
}

export async function startCrawlJobAnalysis(jobId: string) {
  const { data } = await api.post<StartCrawlAnalysisResponse>(`/crawl-jobs/${jobId}/start-analysis`, {
    promptVersion: "v2-thai"
  });
  return data;
}

export async function retryCrawlJob(jobId: string) {
  const { data } = await api.post<CrawlJobDTO>(`/crawl-jobs/${jobId}/retry`);
  return data;
}

export async function deleteCrawlJob(jobId: string) {
  const { data } = await api.delete<{ deleted: boolean }>(`/crawl-jobs/${jobId}`);
  return data;
}

export async function fetchTask(taskId: string) {
  const { data } = await api.get(`/tasks/${taskId}`);
  return data;
}

export async function fetchDashboard(taskId: string, params?: { runId?: string }) {
  const { data } = await api.get<DashboardDTO>(`/tasks/${taskId}/dashboard`, { params });
  return data;
}

export async function fetchDailyBrief(taskId: string) {
  const { data } = await api.get<DailyBriefDTO>(`/tasks/${taskId}/brief`);
  return data;
}

export async function compareTasks(taskIds: string[]) {
  const { data } = await api.post<TaskCompareDTO>("/tasks/compare", { taskIds });
  return data;
}

export async function evaluatePrompts(payload?: {
  systemPrompt?: string;
  userPromptTemplate?: string;
  summaryPrompt?: string;
  insightsPrompt?: string;
}) {
  const { data } = await api.post<PromptEvalDTO>("/workspace/prompt-eval", payload || {});
  return data;
}

export async function fetchTaskReportShares(taskId: string) {
  const { data } = await api.get<ReportShareDTO[]>(`/tasks/${taskId}/shares`);
  return data.map(normalizeReportShare);
}

export async function createTaskReportShare(taskId: string, payload?: { title?: string; expiresAt?: string | null }) {
  const { data } = await api.post<ReportShareDTO>(`/tasks/${taskId}/shares`, payload || {});
  return normalizeReportShare(data);
}

export async function revokeTaskReportShare(taskId: string, shareId: string) {
  const { data } = await api.delete<ReportShareDTO>(`/tasks/${taskId}/shares/${shareId}`);
  return normalizeReportShare(data);
}

export async function fetchSharedReport(token: string) {
  const { data } = await api.get<SharedReportDTO>(`/public/reports/${encodeURIComponent(token)}`, {
    skipAuthRedirect: true
  });
  return data;
}

export async function fetchReviews(taskId: string, params: Record<string, string | number | boolean | undefined>) {
  const { data } = await api.get<{ total: number; page: number; pageSize: number; items: ReviewRowDTO[] }>(
    `/tasks/${taskId}/reviews`,
    { params }
  );
  return data;
}

export async function fetchReviewCorrections(taskId: string, reviewId: string) {
  const { data } = await api.get<ReviewCorrectionDTO[]>(`/tasks/${taskId}/reviews/${reviewId}/correction`);
  return data;
}

export async function createReviewCorrection(
  taskId: string,
  reviewId: string,
  payload: Partial<ReviewCorrectionDTO> & { runId?: string | null }
) {
  const { data } = await api.post<ReviewCorrectionDTO>(`/tasks/${taskId}/reviews/${reviewId}/correction`, payload);
  return data;
}

export async function exportReviews(taskId: string, params: Record<string, string | number | boolean | undefined>) {
  const { data, headers } = await api.get<Blob>(`/tasks/${taskId}/export`, {
    params,
    responseType: "blob"
  });
  return { blob: data, filename: parseContentDispositionFilename(headers["content-disposition"]) };
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

export async function fetchRunLogs(taskId: string, runId: string, params?: { after?: string; limit?: number }) {
  const { data } = await api.get<{ run: AnalysisRunDTO | null; logs: AnalysisRunLogDTO[] }>(
    `/tasks/${taskId}/analysis-runs/${runId}/logs`,
    { params }
  );
  return data;
}

export async function cancelRun(taskId: string, runId: string) {
  const { data } = await api.patch<AnalysisRunDTO>(`/tasks/${taskId}/analysis-runs/${runId}`, { action: "cancel" });
  return data;
}

export async function fetchSavedViews(taskId: string) {
  const { data } = await api.get<SavedReviewViewDTO[]>(`/tasks/${taskId}/views`);
  return data;
}

export async function createSavedView(taskId: string, payload: Partial<SavedReviewViewDTO>) {
  const { data } = await api.post<SavedReviewViewDTO>(`/tasks/${taskId}/views`, payload);
  return data;
}

export async function updateSavedView(taskId: string, viewId: string, payload: Partial<SavedReviewViewDTO>) {
  const { data } = await api.patch<SavedReviewViewDTO>(`/tasks/${taskId}/views/${viewId}`, payload);
  return data;
}

export async function deleteSavedView(taskId: string, viewId: string) {
  const { data } = await api.delete<{ deleted: boolean }>(`/tasks/${taskId}/views/${viewId}`);
  return data;
}

export async function fetchActionItems(taskId: string, params?: { status?: string }) {
  const { data } = await api.get<ReviewActionItemDTO[]>(`/tasks/${taskId}/actions`, { params });
  return data;
}

export async function createActionItem(taskId: string, payload: Partial<ReviewActionItemDTO>) {
  const { data } = await api.post<ReviewActionItemDTO>(`/tasks/${taskId}/actions`, payload);
  return data;
}

export async function updateActionItem(taskId: string, actionId: string, payload: Partial<ReviewActionItemDTO>) {
  const { data } = await api.patch<ReviewActionItemDTO>(`/tasks/${taskId}/actions/${actionId}`, payload);
  return data;
}

export async function deleteActionItem(taskId: string, actionId: string) {
  const { data } = await api.delete<{ deleted: boolean }>(`/tasks/${taskId}/actions/${actionId}`);
  return data;
}

function parseContentDispositionFilename(value: string | undefined) {
  if (!value) {
    return null;
  }
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const asciiMatch = value.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] || null;
}
