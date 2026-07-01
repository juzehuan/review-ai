import { computed, ref } from "vue";
import type { MyWorkspaceDTO, TaskListItem, UserDTO, WorkspaceDTO } from "@review-ai/shared";
import { clearAuthToken, fetchMe, fetchMyWorkspaces, fetchTasks, fetchWorkspace, setWorkspaceSlug } from "./api";

const selectedTaskId = ref<string>("");
const tasks = ref<TaskListItem[]>([]);
const workspace = ref<WorkspaceDTO | null>(null);
const workspaces = ref<MyWorkspaceDTO[]>([]);
const currentUser = ref<UserDTO | null>(null);
const loadingTasks = ref(false);
const bootstrappingAuth = ref(false);

export function useTaskStore() {
  const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) || null);

  async function refreshTasks() {
    loadingTasks.value = true;
    try {
      const [workspaceResult, workspaceListResult, taskResult] = await Promise.all([
        fetchWorkspace(),
        fetchMyWorkspaces(),
        fetchTasks({ taskId: selectedTaskId.value || undefined })
      ]);
      workspace.value = workspaceResult;
      workspaces.value = workspaceListResult;
      tasks.value = taskResult;
      if (!tasks.value.find((task) => task.id === selectedTaskId.value)) {
        selectedTaskId.value = "";
      }
      if (!selectedTaskId.value && tasks.value[0]) {
        selectedTaskId.value = tasks.value[0].id;
      }
    } finally {
      loadingTasks.value = false;
    }
  }

  async function bootstrapAuth() {
    bootstrappingAuth.value = true;
    try {
      const result = await fetchMe();
      currentUser.value = result.user;
      workspace.value = result.workspace;
      await refreshTasks();
      return true;
    } catch {
      currentUser.value = null;
      workspace.value = null;
      workspaces.value = [];
      tasks.value = [];
      selectedTaskId.value = "";
      clearAuthToken();
      return false;
    } finally {
      bootstrappingAuth.value = false;
    }
  }

  function setAuthState(user: UserDTO, nextWorkspace: WorkspaceDTO) {
    currentUser.value = user;
    workspace.value = nextWorkspace;
  }

  async function switchWorkspace(slug: string) {
    setWorkspaceSlug(slug);
    selectedTaskId.value = "";
    await refreshTasks();
  }

  function clearAuthState() {
    currentUser.value = null;
    workspace.value = null;
    workspaces.value = [];
    tasks.value = [];
    selectedTaskId.value = "";
    clearAuthToken();
  }

  function setSelectedTask(taskId: string) {
    selectedTaskId.value = taskId;
  }

  return {
    tasks,
    workspace,
    workspaces,
    currentUser,
    selectedTaskId,
    selectedTask,
    loadingTasks,
    bootstrappingAuth,
    refreshTasks,
    bootstrapAuth,
    setAuthState,
    switchWorkspace,
    clearAuthState,
    setSelectedTask
  };
}
