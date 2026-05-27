import type { MyWorkspaceDTO, TaskListItem, UserDTO, WorkspaceDTO } from "@review-ai/shared";
export declare function useTaskStore(): {
    tasks: import("vue").Ref<{
        id: string;
        workspaceId: string | null;
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
        workspaceId: string | null;
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
    workspace: import("vue").Ref<{
        id: string;
        slug: string;
        name: string;
        planTier: import("@review-ai/shared").PlanTier;
        monthlyReviewLimit: number;
        monthlyRunLimit: number;
        currentPeriodReviewCount: number;
        currentPeriodRunCount: number;
    } | null, WorkspaceDTO | {
        id: string;
        slug: string;
        name: string;
        planTier: import("@review-ai/shared").PlanTier;
        monthlyReviewLimit: number;
        monthlyRunLimit: number;
        currentPeriodReviewCount: number;
        currentPeriodRunCount: number;
    } | null>;
    workspaces: import("vue").Ref<{
        role: import("@review-ai/shared").MemberRole;
        id: string;
        slug: string;
        name: string;
        planTier: import("@review-ai/shared").PlanTier;
        monthlyReviewLimit: number;
        monthlyRunLimit: number;
        currentPeriodReviewCount: number;
        currentPeriodRunCount: number;
    }[], MyWorkspaceDTO[] | {
        role: import("@review-ai/shared").MemberRole;
        id: string;
        slug: string;
        name: string;
        planTier: import("@review-ai/shared").PlanTier;
        monthlyReviewLimit: number;
        monthlyRunLimit: number;
        currentPeriodReviewCount: number;
        currentPeriodRunCount: number;
    }[]>;
    currentUser: import("vue").Ref<{
        id: string;
        email: string;
        name: string;
        isSuperAdmin: boolean;
        createdAt: string;
    } | null, UserDTO | {
        id: string;
        email: string;
        name: string;
        isSuperAdmin: boolean;
        createdAt: string;
    } | null>;
    selectedTaskId: import("vue").Ref<string, string>;
    selectedTask: import("vue").ComputedRef<{
        id: string;
        workspaceId: string | null;
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
    bootstrappingAuth: import("vue").Ref<boolean, boolean>;
    refreshTasks: () => Promise<void>;
    bootstrapAuth: () => Promise<boolean>;
    setAuthState: (user: UserDTO, nextWorkspace: WorkspaceDTO) => void;
    switchWorkspace: (slug: string) => Promise<void>;
    clearAuthState: () => void;
    setSelectedTask: (taskId: string) => void;
};
