<template>
  <div class="task-list-page">
    <div class="task-list-header">
      <div>
        <div class="task-list-title">评论分析任务</div>
        <div class="task-list-sub">管理所有商品的用户评论分析任务，查看分析报告或评论明细。</div>
      </div>
      <a-button type="primary" size="large" @click="router.push('/tasks/new')">
        <template #icon><PlusOutlined /></template>
        新增任务
      </a-button>
    </div>

    <div class="task-cards" v-if="!loading && tasks.length">
      <div v-for="task in tasks" :key="task.id" class="task-card">
        <div class="task-card-top">
          <div class="task-card-info">
            <div class="task-card-name">{{ task.name }}</div>
            <div class="task-card-meta">
              <span><ShopOutlined /> {{ task.productName }}</span>
              <span><GlobalOutlined /> {{ task.sourceChannel }}</span>
              <span><CalendarOutlined /> {{ dayjs(task.createdAt).format("YYYY-MM-DD") }}</span>
            </div>
          </div>
          <div class="task-card-status">
            <a-tag :color="statusColor(task.latestRunStatus)">
              {{ statusLabel(task.latestRunStatus) }}
            </a-tag>
            <div class="task-card-time" v-if="task.latestRunFinishedAt">
              最近分析：{{ dayjs(task.latestRunFinishedAt).format("MM-DD HH:mm") }}
            </div>
          </div>
        </div>

        <div class="task-card-actions">
          <a-button
            type="primary"
            @click="router.push(`/tasks/${task.id}/dashboard`)"
          >
            <template #icon><BarChartOutlined /></template>
            查看分析报告
          </a-button>
          <a-button @click="router.push(`/tasks/${task.id}/reviews`)">
            <template #icon><TableOutlined /></template>
            评论详情
          </a-button>
          <a-popconfirm
            title="删除任务将同时删除所有评论和分析结果，确认删除？"
            ok-text="确认删除"
            ok-type="danger"
            cancel-text="取消"
            @confirm="handleDelete(task.id)"
          >
            <a-button danger>
              <template #icon><DeleteOutlined /></template>
              删除
            </a-button>
          </a-popconfirm>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="task-empty">
      <a-spin size="large" />
    </div>

    <div v-else class="task-empty">
      <a-empty description="暂无任务，点击「新增任务」开始分析">
        <a-button type="primary" @click="router.push('/tasks/new')">
          <template #icon><PlusOutlined /></template>
          新增任务
        </a-button>
      </a-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import {
  BarChartOutlined,
  CalendarOutlined,
  DeleteOutlined,
  GlobalOutlined,
  PlusOutlined,
  ShopOutlined,
  TableOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import type { TaskListItem } from "@review-ai/shared";
import { deleteTask, fetchTasks } from "@/api";

const router = useRouter();
const tasks = ref<TaskListItem[]>([]);
const loading = ref(false);

function statusLabel(status: string | null) {
  const map: Record<string, string> = {
    queued: "排队中",
    running: "分析中",
    completed: "已完成",
    partial_failed: "部分失败",
    failed: "分析失败"
  };
  return status ? (map[status] ?? "未分析") : "未分析";
}

function statusColor(status: string | null) {
  if (!status) return "default";
  if (status === "completed") return "success";
  if (status === "running" || status === "queued") return "processing";
  if (status === "partial_failed") return "warning";
  if (status === "failed") return "error";
  return "default";
}

async function load() {
  loading.value = true;
  try {
    tasks.value = await fetchTasks();
  } finally {
    loading.value = false;
  }
}

async function handleDelete(taskId: string) {
  try {
    await deleteTask(taskId);
    message.success("任务已删除。");
    await load();
  } catch {
    message.error("删除失败。");
  }
}

onMounted(load);
</script>

<style scoped>
.task-list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.task-list-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a2844;
  letter-spacing: -0.02em;
}

.task-list-sub {
  margin-top: 6px;
  font-size: 13px;
  color: #7b8494;
}

.task-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(229, 234, 244, 0.95);
  border-radius: 20px;
  padding: 22px 26px;
  box-shadow: 0 8px 28px rgba(26, 38, 64, 0.06);
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 42px rgba(26, 38, 64, 0.1);
  border-color: rgba(142, 163, 255, 0.5);
}

.task-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.task-card-name {
  font-size: 17px;
  font-weight: 700;
  color: #1a2844;
}

.task-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
  font-size: 13px;
  color: #6d7788;
}

.task-card-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.task-card-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.task-card-time {
  font-size: 12px;
  color: #98a1b2;
}

.task-card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  border-top: 1px solid rgba(229, 234, 244, 0.8);
  padding-top: 18px;
}

.task-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  border: 1px solid rgba(229, 234, 244, 0.95);
}
</style>
