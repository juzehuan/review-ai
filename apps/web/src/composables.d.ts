import type { TaskListItem } from "@review-ai/shared";
export declare function useTaskStore(): {
    tasks: import("vue").Ref<{
        id: string;
        name: string;
        productName: string;
        shopId: string;
        itemId: string;
        sourceChannel: string;
        status: import("@review-ai/shared").TaskStatus;
        latestRunStatus: import("@review-ai/shared").RunStatus | null;
        latestRunFinishedAt: string | null;
        createdAt: string;
    }[], TaskListItem[] | {
        id: string;
        name: string;
        productName: string;
        shopId: string;
        itemId: string;
        sourceChannel: string;
        status: import("@review-ai/shared").TaskStatus;
        latestRunStatus: import("@review-ai/shared").RunStatus | null;
        latestRunFinishedAt: string | null;
        createdAt: string;
    }[]>;
    selectedTaskId: import("vue").Ref<string, string>;
    selectedTask: import("vue").ComputedRef<{
        id: string;
        name: string;
        productName: string;
        shopId: string;
        itemId: string;
        sourceChannel: string;
        status: import("@review-ai/shared").TaskStatus;
        latestRunStatus: import("@review-ai/shared").RunStatus | null;
        latestRunFinishedAt: string | null;
        createdAt: string;
    } | null>;
    loadingTasks: import("vue").Ref<boolean, boolean>;
    refreshTasks: () => Promise<void>;
    setSelectedTask: (taskId: string) => void;
};
