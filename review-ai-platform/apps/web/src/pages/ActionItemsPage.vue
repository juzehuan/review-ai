<template>
  <div v-if="!selectedTask" class="empty-state">
    <a-empty description="请选择一个分析任务查看行动项" />
  </div>

  <div v-else class="action-page">
    <div class="page-toolbar action-hero">
      <div class="toolbar-title-block">
        <div class="panel-label">Action Loop</div>
        <div class="toolbar-title">行动看板</div>
        <div class="toolbar-subtitle">
          {{ selectedTask.name }} · 把评论洞察拆成可分派、可跟进、可复盘的团队行动。
        </div>
      </div>
      <a-space wrap>
        <a-select v-model:value="statusFilter" class="filter-select" @change="load">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
        <a-button @click="load" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button @click="openReport">
          <template #icon><BarChartOutlined /></template>
          返回报告
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新建行动项
        </a-button>
      </a-space>
    </div>

    <div class="summary-grid action-summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">未处理</div>
        <div class="stat-value">{{ countByStatus("open") }}</div>
        <div class="stat-note">需要明确负责人和下一步</div>
      </div>
      <div class="stat-card stat-card-accent">
        <div class="stat-label">处理中</div>
        <div class="stat-value">{{ countByStatus("in_progress") }}</div>
        <div class="stat-note">正在推进的风险或机会</div>
      </div>
      <div class="stat-card stat-card-success">
        <div class="stat-label">已完成</div>
        <div class="stat-value">{{ countByStatus("resolved") }}</div>
        <div class="stat-note">本轮洞察已闭环</div>
      </div>
      <div class="stat-card action-health-card">
        <div class="stat-label">逾期</div>
        <div class="stat-value">{{ overdueCount }}</div>
        <div class="stat-note">超过截止日期且未完成</div>
      </div>
    </div>

    <section class="action-board">
      <div v-for="column in boardColumns" :key="column.status" class="action-column">
        <div class="action-column-head">
          <div>
            <div class="panel-label">{{ column.kicker }}</div>
            <div class="settings-section-title">{{ column.label }}</div>
          </div>
          <a-tag :color="column.color">{{ column.items.length }}</a-tag>
        </div>

        <a-empty v-if="!loading && column.items.length === 0" class="action-empty" description="暂无行动项" />

        <div v-else class="action-card-list">
          <article v-for="item in column.items" :key="item.id" class="action-card">
            <div class="action-card-top">
              <a-tag :color="priorityColor(item.priority)">{{ priorityLabel(item.priority) }}</a-tag>
              <span :class="{ overdue: isOverdue(item.dueAt, item.status) }">{{ formatDate(item.dueAt) }}</span>
            </div>

            <div class="action-card-title">{{ item.title }}</div>
            <div class="action-card-desc">{{ item.description || "暂无说明" }}</div>

            <div class="action-card-meta">
              <span>{{ sourceLabel(item.source) }}</span>
              <span v-if="item.relatedReviewIds.length">关联 {{ item.relatedReviewIds.length }} 条评论</span>
            </div>

            <div class="action-card-controls">
              <a-select :value="item.status" size="small" @change="updateStatus(item, String($event))">
                <a-select-option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </a-select-option>
              </a-select>
              <a-select
                :value="item.assigneeUserId || undefined"
                allow-clear
                size="small"
                placeholder="负责人"
                @change="updateAssignee(item, normalizeUserId($event))"
              >
                <a-select-option v-for="member in members" :key="member.userId" :value="member.userId">
                  {{ member.user.name }}
                </a-select-option>
              </a-select>
            </div>

            <div class="action-card-actions">
              <a-button size="small" @click="openEdit(item)">编辑</a-button>
              <a-button size="small" :disabled="!item.relatedReviewIds.length" @click="openEvidence(item)">证据</a-button>
              <a-popconfirm title="确定删除该行动项？" @confirm="removeItem(item)">
                <a-button size="small" danger>删除</a-button>
              </a-popconfirm>
            </div>
          </article>
        </div>
      </div>
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
          <a-input v-model:value="form.title" placeholder="例如：跟进高频负面反馈" />
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
        <div class="action-form-grid">
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
        </div>
        <a-form-item label="截止日期">
          <a-input v-model:value="form.dueAt" type="date" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { BarChartOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons-vue";
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

const boardColumns = computed(() =>
  [
    { status: "open", label: "未处理", kicker: "Backlog", color: "blue" },
    { status: "in_progress", label: "处理中", kicker: "Doing", color: "orange" },
    { status: "resolved", label: "已完成", kicker: "Done", color: "green" }
  ].map((column) => ({
    ...column,
    items: visibleItems.value.filter((item) => item.status === column.status)
  }))
);

const visibleItems = computed(() => items.value.filter((item) => item.status !== "archived"));
const overdueCount = computed(() => allItems.value.filter((item) => isOverdue(item.dueAt, item.status)).length);

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

function sourceLabel(source: string) {
  if (source === "report_issue") {
    return "来自报告问题";
  }
  if (source === "ai") {
    return "AI 建议";
  }
  return "手动创建";
}

function normalizeUserId(value: unknown) {
  return typeof value === "string" ? value : null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "未设截止";
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
    message.error("请填写行动项标题。");
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
    message.success("行动项已保存。");
    modalOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function updateStatus(item: ReviewActionItemDTO, status: string) {
  if (!selectedTask.value) {
    return;
  }
  await updateActionItem(selectedTask.value.id, item.id, { status });
  message.success(`已更新为${statusLabel(status)}。`);
  await load();
}

async function updateAssignee(item: ReviewActionItemDTO, userId: string | null) {
  if (!selectedTask.value) {
    return;
  }
  await updateActionItem(selectedTask.value.id, item.id, { assigneeUserId: userId });
  message.success("负责人已更新。");
  await load();
}

async function removeItem(item: ReviewActionItemDTO) {
  if (!selectedTask.value) {
    return;
  }
  await deleteActionItem(selectedTask.value.id, item.id);
  message.success("行动项已删除。");
  await load();
}

function openEvidence(item: ReviewActionItemDTO) {
  if (!selectedTask.value || !item.relatedReviewIds.length) {
    return;
  }
  router.push(`/tasks/${selectedTask.value.id}/reviews`);
}

function openReport() {
  if (!selectedTask.value) {
    return;
  }
  router.push(`/tasks/${selectedTask.value.id}/report`);
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
  width: min(1480px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.action-hero {
  align-items: center;
}

.action-summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.action-health-card {
  border-top-color: transparent;
}

.action-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.action-column {
  min-height: 520px;
  padding: 16px;
  border: 1px solid rgba(116, 139, 174, 0.22);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(18px);
}

.action-column-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.action-card-list {
  display: grid;
  gap: 12px;
}

.action-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(116, 139, 174, 0.18);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgba(12, 20, 36, 0.08);
}

.action-card-top,
.action-card-actions,
.action-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.action-card-top span,
.action-card-meta {
  color: #64748b;
  font-size: 12px;
}

.action-card-title {
  color: #0f172a;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.45;
}

.action-card-desc {
  min-height: 42px;
  color: #475569;
  font-size: 13px;
  line-height: 1.65;
}

.action-card-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.action-empty {
  margin-top: 72px;
}

.action-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.overdue {
  color: #dc2626 !important;
  font-weight: 800;
}

@media (max-width: 1280px) {
  .action-board,
  .action-summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .action-card-controls,
  .action-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
