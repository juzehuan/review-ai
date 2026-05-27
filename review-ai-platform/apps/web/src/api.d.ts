import type { AdminOverviewDTO, AdminWorkspaceDTO, AnalysisRunDTO, AuthResponseDTO, DashboardDTO, ImportTaskResponse, MemberRole, MyWorkspaceDTO, ReviewRowDTO, TaskListItem, UserDTO, WorkspaceDTO, WorkspaceMemberDTO } from "@review-ai/shared";
export declare const AUTH_TOKEN_KEY = "reviewiq:auth-token";
export declare const WORKSPACE_SLUG_KEY = "reviewiq:workspace-slug";
export declare function setAuthToken(token: string): void;
export declare function clearAuthToken(): void;
export declare function getAuthToken(): string | null;
export declare function setWorkspaceSlug(slug: string): void;
export declare function getWorkspaceSlug(): string | null;
export declare function login(payload: {
    email: string;
    password: string;
}): Promise<AuthResponseDTO>;
export declare function register(payload: {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
}): Promise<AuthResponseDTO>;
export declare function fetchMe(): Promise<AuthResponseDTO>;
export declare function logout(): Promise<void>;
export declare function fetchTasks(): Promise<TaskListItem[]>;
export declare function fetchWorkspace(): Promise<WorkspaceDTO>;
export declare function fetchMyWorkspaces(): Promise<MyWorkspaceDTO[]>;
export declare function createWorkspace(payload: {
    name: string;
    slug?: string;
}): Promise<MyWorkspaceDTO>;
export declare function fetchWorkspaceMembers(): Promise<WorkspaceMemberDTO[]>;
export declare function createWorkspaceMember(payload: {
    email: string;
    name: string;
    role: MemberRole;
}): Promise<WorkspaceMemberDTO>;
export declare function updateWorkspaceMember(memberId: string, payload: {
    role: MemberRole;
}): Promise<WorkspaceMemberDTO>;
export declare function deleteWorkspaceMember(memberId: string): Promise<{
    success: boolean;
}>;
export declare function fetchAdminOverview(): Promise<AdminOverviewDTO>;
export declare function fetchAdminUsers(): Promise<UserDTO[]>;
export declare function createAdminUser(payload: {
    email: string;
    name: string;
    isSuperAdmin: boolean;
}): Promise<UserDTO>;
export declare function fetchAdminWorkspaces(): Promise<AdminWorkspaceDTO[]>;
export declare function createAdminWorkspace(payload: {
    name: string;
    slug: string;
    planTier: WorkspaceDTO["planTier"];
    monthlyReviewLimit: number;
    monthlyRunLimit: number;
}): Promise<AdminWorkspaceDTO>;
export declare function importTask(payload: {
    name: string;
    productName: string;
    sourceChannel: string;
    file: File;
}): Promise<ImportTaskResponse>;
export declare function fetchTask(taskId: string): Promise<any>;
export declare function fetchDashboard(taskId: string): Promise<DashboardDTO>;
export declare function fetchReviews(taskId: string, params: Record<string, string | number | boolean | undefined>): Promise<{
    total: number;
    page: number;
    pageSize: number;
    items: ReviewRowDTO[];
}>;
export declare function createRun(taskId: string): Promise<AnalysisRunDTO>;
export declare function fetchRuns(taskId: string): Promise<AnalysisRunDTO[]>;
