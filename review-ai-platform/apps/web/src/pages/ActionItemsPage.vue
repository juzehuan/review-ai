<template>
  <div v-if="!selectedTask" class="empty-state">
    <a-empty description="请选择一个分析任务查看行动项" />
  </div>

  <div v-else class="action-page">
    <div class="page-toolbar action-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">行动项</div>
        <div class="toolbar-subtitle">{{ selectedTask.name }} · 将评论洞察分派给团队并跟踪处理状态。</div>
      </div>
      <a-space wrap>
        <a-select v-model:value="statusFilter" class="filter-select" @change="load">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
        <a-button @click="load" :loading="loading">刷新</a-button>
        <a-button type="primary" @click="openCreate">新建行动项</a-button>
      </a-space>
    </div>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">未处理</div>
        <div class="stat-value">{{ countByStatus("open") }}</div>
      </div>
      <div class="stat-card stat-card-accent">
        <div class="stat-label">处理中</div>
        <div class="stat-value">{{ countByStatus("in_progress") }}</div>
      </div>
      <div class="stat-card stat-card-success">
        <div class="stat-label">已完成</div>
        <div class="stat-value">{{ countByStatus("resolved") }}</div>
      </div>
    </div>

    <section class="action-board">
      <a-table row-key="id" :columns="columns" :data-source="items" :loading="loading" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <div class="action-title-cell">
              <strong>{{ record.title }}</strong>
              <span>{{ record.description || "暂无说明" }}</span>
              <div v-if="record.relatedReviewIds.length" class="action-evidence">
                关联评论 {{ record.relatedReviewIds.length }} 条
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'priority'">
            <a-tag :color="priorityColor(record.priority)">{{ priorityLabel(record.priority) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-select :value="record.status" class="status-select" @change="updateStatus(record, $event)">
              <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'assignee'">
            <a-select
              :value="record.assigneeUserId || undefined"
              allow-clear
              class="assignee-select"
              placeholder="未分派"
              @change="updateAssignee(record, $event)"
            >
              <a-select-option v-for="member in members" :key="member.userId" :value="member.userId">
                {{ member.user.name }}
              </a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'dueAt'">
            <div :class="{ overdue: isOverdue(record.dueAt, record.status) }">{{ formatDate(record.dueAt) }}</div>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="openEdit(record)">编辑</a-button>
              <a-button size="small" @click="openEvidence(record)" :disabled="!record.relatedReviewIds.length">证据</a-button>
              <a-popconfirm title="确定删除该行动项？" @confirm="removeItem(record)">
                <a-button size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="modalOpen"
      :title="editingItem ? '编辑行动项' : '新建行动项'"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="submit"
      @cancel="modalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="标题">
          <a-input v-model:value="form.title" placeholder="例如：跟进包装破损问题" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="form.description" :auto-size="{ minRows: 3, maxRows: 6 }" />
        </a-form-item>
        <a-form-item label="负责人">
          <a-select v-model:value="form.assigneeUserId" allow-clear placeholder="选择负责人">
            <a-select-option v-for="member in members" :key="member.userId" :value="member.userId">
              {{ member.user.name }} · {{ member.user.email }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="优先级">
          <a-select v-model:value="form.priority">
            <a-select-option value="high">高</a-select-option>
            <a-select-option value="medium">中</a-select-option>
            <a-select-option value="low">低</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="form.status">
            <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="截止日期">
          <a-input v-model:value="form.dueAt" type="date" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import type { ReviewActionItemDTO, WorkspaceMemberDTO } from "@review-ai/shared";
import {
  createActionItem,
  deleteActionItem,
  fetchActionItems,
  fetchWorkspaceMembers,
  updateActionItem
} from "@/api";
import { useTaskStore } from "@/composables";

const route = useRoute();
const router = useRouter();
const { selectedTask, setSelectedTask } = useTaskStore();

const loading = ref(false);
const saving = ref(false);
const items = ref<ReviewActionItemDTO[]>([]);
const allItems = ref<ReviewActionItemDTO[]>([]);
const members = ref<WorkspaceMemberDTO[]>([]);
const modalOpen = ref(false);
const editingItem = ref<ReviewActionItemDTO | null>(null);
const statusFilter = ref("");
const form = reactive({
  title: "",
  description: "",
  assigneeUserId: undefined as string | undefined,
  priority: "medium",
  status: "open",
  dueAt: ""
});

const statusOptions = [
  { label: "未处理", value: "open" },
  { label: "处理中", value: "in_progress" },
  { label: "已完成", value: "resolved" },
  { label: "已归档", value: "archived" }
];

const columns = [
  { title: "行动项", key: "title", width: 360 },
  { title: "优先级", key: "priority", width: 100 },
  { title: "状态", key: "status", width: 150 },
  { title: "负责人", key: "assignee", width: 180 },
  { title: "截止", key: "dueAt", width: 130 },
  { title: "操作", key: "action", width: 220 }
];

function countByStatus(status: string) {
  return allItems.value.filter((item) => item.status === status).length;
}

function statusLabel(status: string) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

function priorityLabel(priority: string) {
  if (priority === "high") {
    return "高";
  }
  if (priority === "low") {
    return "低";
  }
  return "中";
}

function priorityColor(priority: string) {
  if (priority === "high") {
    return "red";
  }
  if (priority === "low") {
    return "default";
  }
  return "orange";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString();
}

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 10);
}

function isOverdue(value?: string | null, status?: string) {
  if (!value || status === "resolved" || status === "archived") {
    return false;
  }
  return new Date(value).getTime() < Date.now();
}

async function load() {
  if (!selectedTask.value) {
    return;
  }
  loading.value = true;
  try {
    const [filteredItems, allStatusItems, workspaceMembers] = await Promise.all([
      fetchActionItems(selectedTask.value.id, { status: statusFilter.value || undefined }),
      statusFilter.value ? fetchActionItems(selectedTask.value.id) : Promise.resolve(null),
      fetchWorkspaceMembers()
    ]);
    items.value = filteredItems;
    allItems.value = allStatusItems || filteredItems;
    members.value = workspaceMembers;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingItem.value = null;
  form.title = "";
  form.description = "";
  form.assigneeUserId = undefined;
  form.priority = "medium";
  form.status = "open";
  form.dueAt = "";
  modalOpen.value = true;
}

function openEdit(item: ReviewActionItemDTO) {
  editingItem.value = item;
  form.title = item.title;
  form.description = item.description;
  form.assigneeUserId = item.assigneeUserId || undefined;
  form.priority = item.priority;
  form.status = item.status;
  form.dueAt = toDateInput(item.dueAt);
  modalOpen.value = true;
}

async function submit() {
  if (!selectedTask.value || !form.title.trim()) {
    message.error("请填写行动项标题");
    return;
  }
  saving.value = true;
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    assigneeUserId: form.assigneeUserId || null,
    priority: form.priority,
    status: form.status,
    dueAt: form.dueAt || null
  };
  try {
    if (editingItem.value) {
      await updateActionItem(selectedTask.value.id, editingItem.value.id, payload);
    } else {
      await createActionItem(selectedTask.value.id, payload);
    }
    message.success("行动项已保存");
    modalOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function updateStatus(item: ReviewActionItemDTO, status: unknown) {
  if (!selectedTask.value || typeof status !== "string") {
    return;
  }
  await updateActionItem(selectedTask.value.id, item.id, { status });
  message.success(`已更新为${statusLabel(status)}`);
  await load();
}

async function updateAssignee(item: ReviewActionItemDTO, userId: unknown) {
  if (!selectedTask.value) {
    return;
  }
  await updateActionItem(selectedTask.value.id, item.id, {
    assigneeUserId: typeof userId === "string" ? userId : null
  });
  message.success("负责人已更新");
  await load();
}

async function removeItem(item: ReviewActionItemDTO) {
  if (!selectedTask.value) {
    return;
  }
  await deleteActionItem(selectedTask.value.id, item.id);
  message.success("行动项已删除");
  await load();
}

function openEvidence(item: ReviewActionItemDTO) {
  if (!selectedTask.value || !item.relatedReviewIds.length) {
    return;
  }
  router.push(`/tasks/${selectedTask.value.id}/reviews`);
}

watch(
  () => route.params.taskId,
  (taskId) => {
    if (typeof taskId === "string" && taskId !== selectedTask.value?.id) {
      setSelectedTask(taskId);
    }
  },
  { immediate: true }
);

watch(
  () => selectedTask.value?.id,
  () => {
    load();
  },
  { immediate: true }
);

onMounted(load);
</script>

<style scoped>
.action-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-hero {
  align-items: center;
  justify-content: space-between;
}

.action-board {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.action-title-cell {
  display: grid;
  gap: 5px;
}

.action-title-cell span,
.action-evidence {
  color: #64748b;
  font-size: 12px;
}

.status-select,
.assignee-select {
  width: 100%;
}

.overdue {
  color: #dc2626;
  font-weight: 700;
}
</style>
