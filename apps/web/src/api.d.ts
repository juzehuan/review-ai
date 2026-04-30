import type { AnalysisRunDTO, DashboardDTO, ImportTaskResponse, ReviewRowDTO, TaskListItem } from "@review-ai/shared";
export declare function fetchTasks(): Promise<TaskListItem[]>;
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
