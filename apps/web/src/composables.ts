import { computed, ref } from "vue";
import type { TaskListItem } from "@review-ai/shared";
import { fetchTasks } from "./api";

const selectedTaskId = ref<string>("");
const tasks = ref<TaskListItem[]>([]);
const loadingTasks = ref(false);

export function useTaskStore() {
  const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) || null);

  async function refreshTasks() {
    loadingTasks.value = true;
    try {
      tasks.value = await fetchTasks();
      if (!selectedTaskId.value && tasks.value[0]) {
        selectedTaskId.value = tasks.value[0].id;
      }
    } finally {
      loadingTasks.value = false;
    }
  }

  function setSelectedTask(taskId: string) {
    selectedTaskId.value = taskId;
  }

  return {
    tasks,
    selectedTaskId,
    selectedTask,
    loadingTasks,
    refreshTasks,
    setSelectedTask
  };
}

