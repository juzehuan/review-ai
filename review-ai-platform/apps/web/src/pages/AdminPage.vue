<template>
  <div v-if="forbidden" class="dashboard-grid">
    <div class="table-shell">
      <a-result
        status="403"
        title="需要超管权限"
        sub-title="当前账号没有平台级管理权限。请使用超管账号登录，或联系现有超管为你开通权限。"
      >
        <template #extra>
          <a-button type="primary" @click="$router.push('/dashboard')">返回经营看板</a-button>
        </template>
      </a-result>
    </div>
  </div>

  <div v-else class="dashboard-grid">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">超管后台</div>
        <div class="toolbar-subtitle">平台级用户、租户空间、套餐额度和运行规模管理。</div>
      </div>
      <a-space wrap>
        <a-button @click="load" :loading="loading">刷新</a-button>
        <a-button type="primary" @click="openWorkspaceModal">新建空间</a-button>
        <a-button @click="openUserModal">新建用户</a-button>
      </a-space>
    </div>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">用户数</div>
        <div class="stat-value">{{ overview?.userCount || 0 }}</div>
      </div>
      <div class="stat-card stat-card-success">
        <div class="stat-label">租户空间</div>
        <div class="stat-value">{{ overview?.workspaceCount || 0 }}</div>
      </div>
      <div class="stat-card stat-card-accent">
        <div class="stat-label">分析项目</div>
        <div class="stat-value">{{ overview?.taskCount || 0 }}</div>
      </div>
    </div>

    <div class="table-shell">
      <div class="table-title">租户空间</div>
      <a-table :columns="workspaceColumns" :data-source="workspaces" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="member-name">{{ record.name }}</div>
            <div class="member-email">{{ record.slug }}</div>
          </template>
          <template v-else-if="column.key === 'planTier'">
            <a-tag color="blue">{{ record.planTier }}</a-tag>
          </template>
          <template v-else-if="column.key === 'usage'">
            {{ record.currentPeriodReviewCount }}/{{ record.monthlyReviewLimit }} 评论 ·
            {{ record.currentPeriodRunCount }}/{{ record.monthlyRunLimit }} 分析
          </template>
        </template>
      </a-table>
    </div>

    <div class="table-shell">
      <div class="table-title">平台用户</div>
      <a-table :columns="userColumns" :data-source="users" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <div class="member-cell">
              <div class="member-avatar">{{ record.name.slice(0, 1).toUpperCase() }}</div>
              <div>
                <div class="member-name">{{ record.name }}</div>
                <div class="member-email">{{ record.email }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'isSuperAdmin'">
            <a-tag :color="record.isSuperAdmin ? 'purple' : 'default'">
              {{ record.isSuperAdmin ? "超管" : "普通用户" }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      :open="userModalOpen"
      title="新建平台用户"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="submitUser"
      @cancel="userModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="姓名">
          <a-input v-model:value="userForm.name" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model:value="userForm.email" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="userForm.isSuperAdmin">设为超管</a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="workspaceModalOpen"
      title="新建租户空间"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="submitWorkspace"
      @cancel="workspaceModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="空间名称">
          <a-input v-model:value="workspaceForm.name" placeholder="例如：品牌增长团队" />
        </a-form-item>
        <a-form-item label="Slug">
          <a-input v-model:value="workspaceForm.slug" placeholder="brand-growth" />
        </a-form-item>
        <a-form-item label="套餐">
          <a-select v-model:value="workspaceForm.planTier">
            <a-select-option value="free">free</a-select-option>
            <a-select-option value="pro">pro</a-select-option>
            <a-select-option value="business">business</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="月评论额度">
          <a-input-number v-model:value="workspaceForm.monthlyReviewLimit" class="full-input" :min="0" />
        </a-form-item>
        <a-form-item label="月分析次数">
          <a-input-number v-model:value="workspaceForm.monthlyRunLimit" class="full-input" :min="0" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import axios from "axios";
import type { AdminOverviewDTO, AdminWorkspaceDTO, PlanTier, UserDTO } from "@review-ai/shared";
import {
  createAdminUser,
  createAdminWorkspace,
  fetchAdminOverview,
  fetchAdminUsers,
  fetchAdminWorkspaces
} from "@/api";

const loading = ref(false);
const saving = ref(false);
const userModalOpen = ref(false);
const workspaceModalOpen = ref(false);
const overview = ref<AdminOverviewDTO | null>(null);
const users = ref<UserDTO[]>([]);
const workspaces = ref<AdminWorkspaceDTO[]>([]);
const forbidden = ref(false);

const userForm = reactive({
  name: "",
  email: "",
  isSuperAdmin: false
});

const workspaceForm = reactive({
  name: "",
  slug: "",
  planTier: "pro" as PlanTier,
  monthlyReviewLimit: 20000,
  monthlyRunLimit: 200
});

const workspaceColumns = [
  { title: "空间", key: "name", width: 260 },
  { title: "套餐", dataIndex: "planTier", key: "planTier", width: 120 },
  { title: "成员", dataIndex: "memberCount", key: "memberCount", width: 100 },
  { title: "项目", dataIndex: "taskCount", key: "taskCount", width: 100 },
  { title: "用量", key: "usage", width: 320 },
  { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 220 }
];

const userColumns = [
  { title: "用户", key: "user", width: 320 },
  { title: "权限", key: "isSuperAdmin", width: 140 },
  { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 220 }
];

async function load() {
  loading.value = true;
  forbidden.value = false;
  try {
    const [overviewResult, userResult, workspaceResult] = await Promise.all([
      fetchAdminOverview(),
      fetchAdminUsers(),
      fetchAdminWorkspaces()
    ]);
    overview.value = overviewResult;
    users.value = userResult;
    workspaces.value = workspaceResult;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      forbidden.value = true;
      return;
    }
    message.error("加载超管数据失败。");
  } finally {
    loading.value = false;
  }
}

function openUserModal() {
  userForm.name = "";
  userForm.email = "";
  userForm.isSuperAdmin = false;
  userModalOpen.value = true;
}

function openWorkspaceModal() {
  workspaceForm.name = "";
  workspaceForm.slug = "";
  workspaceForm.planTier = "pro";
  workspaceForm.monthlyReviewLimit = 20000;
  workspaceForm.monthlyRunLimit = 200;
  workspaceModalOpen.value = true;
}

async function submitUser() {
  if (!userForm.name || !userForm.email) {
    message.error("请填写姓名和邮箱。");
    return;
  }

  saving.value = true;
  try {
    await createAdminUser({ ...userForm });
    message.success("用户已保存。");
    userModalOpen.value = false;
    await load();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      forbidden.value = true;
      message.error("当前账号没有超管权限。");
      return;
    }
    message.error("保存用户失败。");
  } finally {
    saving.value = false;
  }
}

async function submitWorkspace() {
  if (!workspaceForm.name || !workspaceForm.slug) {
    message.error("请填写空间名称和 slug。");
    return;
  }

  saving.value = true;
  try {
    await createAdminWorkspace({ ...workspaceForm });
    message.success("空间已创建。");
    workspaceModalOpen.value = false;
    await load();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      forbidden.value = true;
      message.error("当前账号没有超管权限。");
      return;
    }
    message.error("创建空间失败。");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
