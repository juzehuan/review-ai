<template>
  <a-layout class="app-shell">
    <div class="shell-glow shell-glow-left" />
    <div class="shell-glow shell-glow-right" />

    <!-- Task detail layout: sidebar + content -->
    <template v-if="isTaskRoute">
      <a-layout-sider theme="light" width="272" class="app-sider">
        <div class="brand-block">
          <div class="brand-mark">AI</div>
          <div>
            <div class="brand-title">Review Intelligence</div>
            <div class="brand-subtitle">商品评论智能分析台</div>
          </div>
        </div>

        <div class="sider-back" @click="router.push('/')">
          <LeftOutlined /> 返回任务列表
        </div>

        <div class="sider-task-panel">
          <div class="sider-caption">Current Task</div>
          <div class="task-highlight">
            <div class="task-highlight-name">{{ currentTask?.name || "加载中…" }}</div>
            <div class="task-highlight-meta">{{ currentTask?.productName || "" }}</div>
          </div>
        </div>

        <div class="sider-caption sider-ws-caption">Workspace</div>
        <a-menu :selectedKeys="[route.path]" mode="inline" :items="menuItems" @click="onMenuClick" />

        <div class="sider-footer">
          <a-dropdown v-if="currentTask" placement="topLeft">
            <a-button block>
              <template #icon><MoreOutlined /></template>
              任务操作
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="edit" @click="openEditModal">
                  <EditOutlined /> 编辑任务信息
                </a-menu-item>
                <a-menu-item key="append" @click="showAppendImport = true">
                  <UploadOutlined /> 追加导入评论
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="delete" danger @click="confirmDeleteTask">
                  <DeleteOutlined /> 删除任务
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-sider>

      <a-layout class="app-main">
        <a-layout-content class="app-content">
          <router-view />
        </a-layout-content>
      </a-layout>
    </template>

    <!-- Minimal layout: task list, new task, and settings pages -->
    <template v-else>
      <a-layout class="app-main">
        <a-layout-header class="app-header-minimal">
          <router-link to="/" class="brand-block brand-link">
            <div class="brand-mark">AI</div>
            <div>
              <div class="brand-title">Review Intelligence</div>
              <div class="brand-subtitle">商品评论智能分析台</div>
            </div>
          </router-link>
          <div class="header-actions">
            <router-link to="/settings" class="header-link" :class="{ active: route.path === '/settings' }">
              <SettingOutlined /> 设置
            </router-link>
          </div>
        </a-layout-header>
        <a-layout-content class="app-content">
          <router-view />
        </a-layout-content>
      </a-layout>
    </template>
  </a-layout>

  <!-- Append import modal -->
  <a-modal
    :open="showAppendImport"
    title="追加导入评论"
    ok-text="导入"
    cancel-text="取消"
    :confirm-loading="appendLoading"
    @ok="submitAppend"
    @cancel="showAppendImport = false"
  >
    <a-form layout="vertical">
      <a-form-item label="CSV 文件">
        <input type="file" accept=".csv" @change="onAppendFileChange" />
      </a-form-item>
      <div class="append-hint">已存在的评论 ID 将自动跳过，只导入新增评论。</div>
    </a-form>
  </a-modal>

  <!-- Edit task modal -->
  <a-modal
    :open="showEditTask"
    title="编辑任务信息"
    ok-text="保存"
    cancel-text="取消"
    :confirm-loading="editLoading"
    @ok="submitEdit"
    @cancel="showEditTask = false"
  >
    <a-form layout="vertical">
      <a-form-item label="任务名称">
        <a-input v-model:value="editForm.name" />
      </a-form-item>
      <a-form-item label="商品名称">
        <a-input v-model:value="editForm.productName" />
      </a-form-item>
      <a-form-item label="来源渠道">
        <a-input v-model:value="editForm.sourceChannel" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, h, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  MoreOutlined,
  SettingOutlined,
  TableOutlined,
  UploadOutlined
} from "@ant-design/icons-vue";
import { Modal, message } from "ant-design-vue";
import type { TaskListItem } from "@review-ai/shared";
import { appendImport, deleteTask, fetchTask, updateTask } from "@/api";

const router = useRouter();
const route = useRoute();
const taskId = computed(() => route.params.taskId as string | undefined);
const isTaskRoute = computed(() => Boolean(taskId.value));

const showAppendImport = ref(false);
const showEditTask = ref(false);
const appendLoading = ref(false);
const editLoading = ref(false);
const appendFile = ref<File | null>(null);
const editForm = reactive({ name: "", productName: "", sourceChannel: "" });
const currentTask = ref<TaskListItem | null>(null);

const menuItems = computed(() => [
  { key: `/tasks/${taskId.value}/dashboard`, icon: () => h(BarChartOutlined), label: "在线评论看板" },
  { key: `/tasks/${taskId.value}/reviews`, icon: () => h(TableOutlined), label: "用户评论（AI分析）" }
]);

function onMenuClick({ key }: { key: string }) {
  router.push(key);
}

async function loadCurrentTask() {
  if (!taskId.value) {
    currentTask.value = null;
    return;
  }
  try {
    currentTask.value = await fetchTask(taskId.value);
  } catch {
    currentTask.value = null;
  }
}

function onAppendFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  appendFile.value = target.files?.[0] || null;
}

async function submitAppend() {
  if (!taskId.value || !appendFile.value) {
    message.error("请选择 CSV 文件。");
    return;
  }
  appendLoading.value = true;
  try {
    const result = await appendImport(taskId.value, appendFile.value);
    message.success(`追加成功：新增 ${result.newRows} 条，跳过 ${result.skippedRows} 条重复。`);
    showAppendImport.value = false;
    appendFile.value = null;
  } catch {
    message.error("追加导入失败。");
  } finally {
    appendLoading.value = false;
  }
}

function openEditModal() {
  if (!currentTask.value) return;
  editForm.name = currentTask.value.name;
  editForm.productName = currentTask.value.productName;
  editForm.sourceChannel = currentTask.value.sourceChannel;
  showEditTask.value = true;
}

async function submitEdit() {
  if (!taskId.value) return;
  if (!editForm.name.trim() || !editForm.productName.trim()) {
    message.error("名称不能为空。");
    return;
  }
  editLoading.value = true;
  try {
    await updateTask(taskId.value, {
      name: editForm.name.trim(),
      productName: editForm.productName.trim(),
      sourceChannel: editForm.sourceChannel.trim()
    });
    message.success("任务信息已更新。");
    showEditTask.value = false;
    await loadCurrentTask();
  } catch {
    message.error("更新失败。");
  } finally {
    editLoading.value = false;
  }
}

function confirmDeleteTask() {
  if (!currentTask.value || !taskId.value) return;
  const name = currentTask.value.name;
  const id = taskId.value;
  Modal.confirm({
    title: "确认删除任务",
    content: `删除「${name}」将同时删除所有评论和分析结果，此操作不可撤销。`,
    okText: "确认删除",
    okType: "danger",
    cancelText: "取消",
    async onOk() {
      try {
        await deleteTask(id);
        message.success("任务已删除。");
        router.push("/");
      } catch {
        message.error("删除失败。");
      }
    }
  });
}

watch(taskId, loadCurrentTask, { immediate: true });
</script>

<style scoped>
.sider-back {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 8px 8px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  color: #516079;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.sider-back:hover {
  background: rgba(241, 245, 255, 0.9);
  color: #1f3d8a;
}

.sider-ws-caption {
  margin-top: 20px;
}

.app-header-minimal {
  flex-shrink: 0;
  height: auto !important;
  line-height: unset !important;
  padding: 22px 32px 18px;
  background: transparent !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5d7c;
  text-decoration: none;
  border: 1px solid rgba(229, 234, 244, 0.95);
  background: rgba(255, 255, 255, 0.7);
  transition: all 0.18s ease;
}

.header-link:hover {
  border-color: rgba(99, 102, 241, 0.5);
  color: #4f46e5;
}

.header-link.active {
  background: linear-gradient(135deg, #6a82fb, #4f46e5);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(106, 130, 251, 0.35);
}

.append-hint {
  color: #7b8494;
  font-size: 12px;
  margin-top: -8px;
}
</style>
