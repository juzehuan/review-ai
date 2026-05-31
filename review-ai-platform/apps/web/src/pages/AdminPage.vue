<template>
  <div v-if="forbidden" class="dashboard-grid">
    <div class="table-shell">
      <a-result status="403" title="需要超管权限" sub-title="当前账号没有平台超管权限。">
        <template #extra>
          <a-button type="primary" @click="$router.push('/dashboard')">返回用户后台</a-button>
        </template>
      </a-result>
    </div>
  </div>

  <div v-else class="dashboard-grid">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">超管后台</div>
        <div class="toolbar-subtitle">管理平台注册入口、普通用户配额和超管账号。普通用户后台只保留分析任务与个人设置。</div>
      </div>
      <a-space wrap>
        <a-button @click="load" :loading="loading">刷新</a-button>
        <a-button type="primary" @click="openInviteModal">生成邀请码</a-button>
        <a-button @click="openUserModal">新建账号</a-button>
      </a-space>
    </div>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">平台用户</div>
        <div class="stat-value">{{ overview?.userCount || 0 }}</div>
        <div class="stat-note">包含超管与普通用户</div>
      </div>
      <div class="stat-card stat-card-success">
        <div class="stat-label">可用邀请码</div>
        <div class="stat-value">{{ overview?.availableInviteCodeCount || 0 }}</div>
        <div class="stat-note">已使用的邀请码无法再次注册</div>
      </div>
      <div class="stat-card stat-card-accent">
        <div class="stat-label">分析任务</div>
        <div class="stat-value">{{ overview?.taskCount || 0 }}</div>
        <div class="stat-note">全平台累计任务</div>
      </div>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="admin-tabs">
      <a-tab-pane key="users" tab="用户与配额">
        <div class="table-shell">
          <div class="table-title">用户管理</div>
          <a-table :columns="userColumns" :data-source="users" :loading="loading" row-key="id" :scroll="{ x: 1120 }">
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
              <template v-else-if="column.key === 'role'">
                <a-switch
                  :checked="record.isSuperAdmin"
                  checked-children="超管"
                  un-checked-children="用户"
                  :loading="savingUserId === record.id"
                  @change="(checked: unknown) => saveUser(record, { isSuperAdmin: Boolean(checked) })"
                />
              </template>
              <template v-else-if="column.key === 'quota'">
                <div class="quota-editor">
                  <a-input-number
                    :value="record.monthlyReviewLimit"
                    :min="0"
                    :step="1000"
                    addon-after="评论"
                    @change="(value: number | string | null) => updateDraft(record.id, 'monthlyReviewLimit', value)"
                  />
                  <a-input-number
                    :value="record.monthlyRunLimit"
                    :min="0"
                    :step="10"
                    addon-after="分析"
                    @change="(value: number | string | null) => updateDraft(record.id, 'monthlyRunLimit', value)"
                  />
                  <a-button size="small" type="primary" :loading="savingUserId === record.id" @click="saveQuota(record)">
                    保存
                  </a-button>
                </div>
              </template>
              <template v-else-if="column.key === 'usage'">
                <div class="usage-cell">
                  <span>{{ record.currentPeriodReviewCount }}/{{ record.monthlyReviewLimit }} 评论</span>
                  <a-progress :percent="reviewPercent(record)" size="small" :show-info="false" />
                  <span>{{ record.currentPeriodRunCount }}/{{ record.monthlyRunLimit }} 分析</span>
                </div>
              </template>
              <template v-else-if="column.key === 'inviteCode'">
                <a-tag v-if="record.inviteCode" color="blue">{{ record.inviteCode }}</a-tag>
                <span v-else class="muted">无</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="invites" tab="邀请码">
        <div class="table-shell">
          <div class="table-title">邀请码池</div>
          <a-table :columns="inviteColumns" :data-source="inviteCodes" :loading="loading" row-key="id" :scroll="{ x: 1060 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'code'">
                <a-space>
                  <a-typography-text code>{{ record.code }}</a-typography-text>
                  <a-button size="small" @click="copyCode(record.code)">复制</a-button>
                </a-space>
                <div v-if="record.note" class="member-email">{{ record.note }}</div>
              </template>
              <template v-else-if="column.key === 'quota'">
                {{ record.monthlyReviewLimit }} 评论 / {{ record.monthlyRunLimit }} 分析
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.usedAt ? 'default' : 'green'">{{ record.usedAt ? '已使用' : '可使用' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'usedBy'">
                <span v-if="record.usedBy">{{ record.usedBy.name }} · {{ record.usedBy.email }}</span>
                <span v-else class="muted">尚未使用</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      :open="inviteModalOpen"
      title="生成邀请码"
      ok-text="生成"
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="submitInvite"
      @cancel="inviteModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="备注">
          <a-input v-model:value="inviteForm.note" placeholder="例如：5 月测试用户 / 某客户试用" />
        </a-form-item>
        <a-form-item label="评论配额">
          <a-input-number v-model:value="inviteForm.monthlyReviewLimit" class="full-input" :min="1" :step="1000" />
        </a-form-item>
        <a-form-item label="分析次数配额">
          <a-input-number v-model:value="inviteForm.monthlyRunLimit" class="full-input" :min="1" :step="10" />
        </a-form-item>
        <a-form-item label="过期时间">
          <a-date-picker v-model:value="inviteForm.expiresAt" class="full-input" show-time />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="userModalOpen"
      title="新建平台账号"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import axios from "axios";
import type { Dayjs } from "dayjs";
import type { AdminOverviewDTO, AdminUserDTO, InviteCodeDTO } from "@review-ai/shared";
import {
  createAdminUser,
  createInviteCode,
  fetchAdminOverview,
  fetchAdminUsers,
  fetchInviteCodes,
  updateAdminUser
} from "@/api";

const loading = ref(false);
const saving = ref(false);
const activeTab = ref("users");
const userModalOpen = ref(false);
const inviteModalOpen = ref(false);
const overview = ref<AdminOverviewDTO | null>(null);
const users = ref<AdminUserDTO[]>([]);
const inviteCodes = ref<InviteCodeDTO[]>([]);
const forbidden = ref(false);
const savingUserId = ref("");
const quotaDrafts = reactive<Record<string, { monthlyReviewLimit: number; monthlyRunLimit: number }>>({});

const userForm = reactive({
  name: "",
  email: "",
  isSuperAdmin: false
});

const inviteForm = reactive<{
  note: string;
  monthlyReviewLimit: number;
  monthlyRunLimit: number;
  expiresAt: Dayjs | null;
}>({
  note: "",
  monthlyReviewLimit: 20000,
  monthlyRunLimit: 200,
  expiresAt: null
});

const userColumns = [
  { title: "用户", key: "user", width: 280 },
  { title: "后台权限", key: "role", width: 150 },
  { title: "配额调整", key: "quota", width: 390 },
  { title: "本期用量", key: "usage", width: 230 },
  { title: "注册邀请码", key: "inviteCode", width: 180 },
  { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 210 }
];

const inviteColumns = [
  { title: "邀请码", key: "code", width: 310 },
  { title: "配额", key: "quota", width: 220 },
  { title: "状态", key: "status", width: 110 },
  { title: "使用人", key: "usedBy", width: 260 },
  { title: "创建人", dataIndex: ["createdBy", "name"], key: "createdBy", width: 130 },
  { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 210 }
];

async function load() {
  loading.value = true;
  forbidden.value = false;
  try {
    const [overviewResult, userResult, inviteResult] = await Promise.all([
      fetchAdminOverview(),
      fetchAdminUsers(),
      fetchInviteCodes()
    ]);
    overview.value = overviewResult;
    users.value = userResult;
    inviteCodes.value = inviteResult;
    for (const user of userResult) {
      quotaDrafts[user.id] = {
        monthlyReviewLimit: user.monthlyReviewLimit,
        monthlyRunLimit: user.monthlyRunLimit
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      forbidden.value = true;
      return;
    }
    message.error("加载超管数据失败");
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

function openInviteModal() {
  inviteForm.note = "";
  inviteForm.monthlyReviewLimit = 20000;
  inviteForm.monthlyRunLimit = 200;
  inviteForm.expiresAt = null;
  inviteModalOpen.value = true;
}

function updateDraft(userId: string, key: "monthlyReviewLimit" | "monthlyRunLimit", value: number | string | null) {
  const user = users.value.find((item) => item.id === userId);
  if (!user) {
    return;
  }
  quotaDrafts[userId] = {
    monthlyReviewLimit: quotaDrafts[userId]?.monthlyReviewLimit ?? user.monthlyReviewLimit,
    monthlyRunLimit: quotaDrafts[userId]?.monthlyRunLimit ?? user.monthlyRunLimit,
    [key]: Number(value || 0)
  };
}

async function saveUser(record: AdminUserDTO, patch: { isSuperAdmin?: boolean }) {
  savingUserId.value = record.id;
  try {
    const updated = await updateAdminUser(record.id, patch);
    users.value = users.value.map((item) => (item.id === updated.id ? updated : item));
    message.success("用户权限已更新");
  } catch {
    message.error("用户权限更新失败");
  } finally {
    savingUserId.value = "";
  }
}

async function saveQuota(record: AdminUserDTO) {
  const draft = quotaDrafts[record.id] || record;
  savingUserId.value = record.id;
  try {
    const updated = await updateAdminUser(record.id, {
      monthlyReviewLimit: draft.monthlyReviewLimit,
      monthlyRunLimit: draft.monthlyRunLimit
    });
    users.value = users.value.map((item) => (item.id === updated.id ? updated : item));
    quotaDrafts[record.id] = {
      monthlyReviewLimit: updated.monthlyReviewLimit,
      monthlyRunLimit: updated.monthlyRunLimit
    };
    message.success("用户配额已更新");
  } catch {
    message.error("用户配额更新失败");
  } finally {
    savingUserId.value = "";
  }
}

async function submitUser() {
  if (!userForm.name || !userForm.email) {
    message.error("请填写姓名和邮箱");
    return;
  }

  saving.value = true;
  try {
    await createAdminUser({ ...userForm });
    message.success("用户已保存");
    userModalOpen.value = false;
    await load();
  } catch {
    message.error("保存用户失败");
  } finally {
    saving.value = false;
  }
}

async function submitInvite() {
  saving.value = true;
  try {
    const created = await createInviteCode({
      note: inviteForm.note,
      monthlyReviewLimit: inviteForm.monthlyReviewLimit,
      monthlyRunLimit: inviteForm.monthlyRunLimit,
      expiresAt: inviteForm.expiresAt?.toISOString() || null
    });
    message.success(`邀请码已生成：${created.code}`);
    inviteModalOpen.value = false;
    await load();
  } catch {
    message.error("生成邀请码失败");
  } finally {
    saving.value = false;
  }
}

async function copyCode(code: string) {
  await navigator.clipboard?.writeText(code);
  message.success("邀请码已复制");
}

function reviewPercent(record: AdminUserDTO) {
  if (!record.monthlyReviewLimit) {
    return 0;
  }
  return Math.min(Math.round((record.currentPeriodReviewCount / record.monthlyReviewLimit) * 100), 100);
}

onMounted(load);
</script>
