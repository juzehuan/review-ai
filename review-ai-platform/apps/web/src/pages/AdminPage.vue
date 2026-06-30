<template>
  <div v-if="forbidden" class="dashboard-grid">
    <div class="table-shell">
      <a-result status="403" title="需要超管权限" sub-title="当前账号没有平台超管权限。">
        <template #extra>
          <a-button type="primary" @click="$router.push('/dashboard')">
            <template #icon><ArrowLeftOutlined /></template>
            返回用户后台
          </a-button>
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
        <a-button @click="load" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" @click="openInviteModal">
          <template #icon><KeyOutlined /></template>
          生成邀请码
        </a-button>
        <a-button @click="openUserModal">
          <template #icon><UserAddOutlined /></template>
          新建账号
        </a-button>
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
          <a-table :columns="userColumns" :data-source="users" :loading="loading" row-key="id" :scroll="{ x: 1360 }">
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
              <template v-else-if="column.key === 'status'">
                <a-switch
                  :checked="record.isActive"
                  checked-children="启用"
                  un-checked-children="禁用"
                  :disabled="record.id === currentUser?.id"
                  :loading="savingUserId === record.id"
                  @change="(checked: unknown) => saveUser(record, { isActive: Boolean(checked) }, '用户状态已更新')"
                />
              </template>
              <template v-else-if="column.key === 'quota'">
                <a-tag v-if="record.isSuperAdmin" color="purple">超管不限额</a-tag>
                <div v-else class="quota-editor">
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
                <div v-if="record.isSuperAdmin" class="usage-cell">
                  <span>不限额</span>
                </div>
                <div v-else class="usage-cell">
                  <span>{{ record.currentPeriodReviewCount }}/{{ record.monthlyReviewLimit }} 评论</span>
                  <a-progress :percent="reviewPercent(record)" size="small" :show-info="false" />
                  <span>{{ record.currentPeriodRunCount }}/{{ record.monthlyRunLimit }} 分析</span>
                </div>
              </template>
              <template v-else-if="column.key === 'inviteCode'">
                <a-tag v-if="record.inviteCode" color="blue">{{ record.inviteCode }}</a-tag>
                <span v-else class="muted">无</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-popconfirm
                  title="确定将该用户密码重置为 123456？"
                  ok-text="重置"
                  cancel-text="取消"
                  @confirm="resetPassword(record)"
                >
                  <a-button size="small" :loading="savingUserId === record.id">重置密码</a-button>
                </a-popconfirm>
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

      <a-tab-pane key="queues" tab="队列健康">
        <div class="table-shell">
          <div class="table-title">任务队列状态</div>
          <div class="member-email">更新时间：{{ formatTime(queueHealth?.updatedAt) }}</div>
          <div class="summary-grid">
            <div v-for="queue in queueHealth?.queues || []" :key="queue.name" class="stat-card" :class="queue.failed ? 'stat-card-alert' : 'stat-card-success'">
              <div class="stat-label">{{ queue.label }}</div>
              <div class="stat-value">{{ queue.pending }}</div>
              <div class="stat-note">
                等待 {{ queue.waiting }} · 运行 {{ queue.active }} · 延迟 {{ queue.delayed }} · 失败 {{ queue.failed }}
              </div>
              <a-alert v-if="queue.error" type="error" show-icon :message="queue.error" />
              <a-tag v-else :color="queue.isPaused ? 'orange' : 'green'">{{ queue.isPaused ? "已暂停" : "消费中" }}</a-tag>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="audit" tab="操作日志">
        <div class="table-shell">
          <div class="table-title">最近操作</div>
          <a-table :columns="auditColumns" :data-source="auditLogs" :loading="loading" row-key="id" :pagination="{ pageSize: 12 }" :scroll="{ x: 1120 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <a-tag color="blue">{{ actionLabel(record.action) }}</a-tag>
                <div class="member-email">{{ record.action }}</div>
              </template>
              <template v-else-if="column.key === 'actor'">
                <div>{{ record.actorName || "系统" }}</div>
                <div class="member-email">{{ record.actorEmail || "-" }}</div>
              </template>
              <template v-else-if="column.key === 'target'">
                <div>{{ targetTypeLabel(record.targetType) }}</div>
                <div class="member-email">{{ record.targetLabel || record.targetId || "-" }}</div>
              </template>
              <template v-else-if="column.key === 'metadata'">
                <a-tooltip :title="metadataText(record.metadata)">
                  <span class="muted">{{ metadataSummary(record.metadata) }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.key === 'time'">
                {{ formatTime(record.createdAt) }}
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
import { ArrowLeftOutlined, KeyOutlined, ReloadOutlined, UserAddOutlined } from "@ant-design/icons-vue";
import axios from "axios";
import type { Dayjs } from "dayjs";
import type { AdminOverviewDTO, AdminUserDTO, AuditLogDTO, InviteCodeDTO, QueueHealthDTO } from "@review-ai/shared";
import {
  fetchAdminAuditLogs,
  fetchAdminQueueHealth,
  createAdminUser,
  createInviteCode,
  fetchAdminOverview,
  fetchAdminUsers,
  fetchInviteCodes,
  resetAdminUserPassword,
  updateAdminUser
} from "@/api";
import { useTaskStore } from "@/composables";
import { copyTextToClipboard } from "@/utils/clipboard";

const loading = ref(false);
const saving = ref(false);
const activeTab = ref("users");
const userModalOpen = ref(false);
const inviteModalOpen = ref(false);
const overview = ref<AdminOverviewDTO | null>(null);
const users = ref<AdminUserDTO[]>([]);
const inviteCodes = ref<InviteCodeDTO[]>([]);
const auditLogs = ref<AuditLogDTO[]>([]);
const queueHealth = ref<QueueHealthDTO | null>(null);
const forbidden = ref(false);
const savingUserId = ref("");
const quotaDrafts = reactive<Record<string, { monthlyReviewLimit: number; monthlyRunLimit: number }>>({});
const { currentUser } = useTaskStore();

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
  { title: "账号状态", key: "status", width: 130 },
  { title: "配额调整", key: "quota", width: 390 },
  { title: "本期用量", key: "usage", width: 230 },
  { title: "注册邀请码", key: "inviteCode", width: 180 },
  { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 210 },
  { title: "操作", key: "actions", width: 130, fixed: "right" }
];

const inviteColumns = [
  { title: "邀请码", key: "code", width: 310 },
  { title: "配额", key: "quota", width: 220 },
  { title: "状态", key: "status", width: 110 },
  { title: "使用人", key: "usedBy", width: 260 },
  { title: "创建人", dataIndex: ["createdBy", "name"], key: "createdBy", width: 130 },
  { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 210 }
];

const auditColumns = [
  { title: "时间", key: "time", width: 190 },
  { title: "操作", key: "action", width: 210 },
  { title: "操作人", key: "actor", width: 220 },
  { title: "对象", key: "target", width: 260 },
  { title: "IP", dataIndex: "ipAddress", key: "ipAddress", width: 150 },
  { title: "详情", key: "metadata", width: 260 }
];

async function loadAuditLogs() {
  auditLogs.value = await fetchAdminAuditLogs({ limit: 120 });
}

async function loadQueueHealth() {
  queueHealth.value = await fetchAdminQueueHealth();
}

async function load() {
  loading.value = true;
  forbidden.value = false;
  try {
    const [overviewResult, userResult, inviteResult, queueResult, auditResult] = await Promise.all([
      fetchAdminOverview(),
      fetchAdminUsers(),
      fetchInviteCodes(),
      loadQueueHealth().then(() => queueHealth.value),
      loadAuditLogs().then(() => auditLogs.value)
    ]);
    overview.value = overviewResult;
    users.value = userResult;
    inviteCodes.value = inviteResult;
    queueHealth.value = queueResult;
    auditLogs.value = auditResult;
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

function readErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return fallback;
}

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function actionLabel(action: string) {
  return (
    {
      "admin.user.upsert": "保存账号",
      "admin.user.update": "更新用户",
      "admin.user.reset_password": "重置密码",
      "admin.invite_code.create": "生成邀请码",
      "settings.ai.update": "更新 AI 设置",
      "settings.crawler.update": "更新爬虫设置",
      "task.delete": "删除任务",
      "report_share.create": "创建分享",
      "report_share.revoke": "撤销分享"
    }[action] || action
  );
}

function targetTypeLabel(type: string) {
  return (
    {
      user: "用户",
      invite_code: "邀请码",
      workspace_ai_setting: "AI 设置",
      workspace_crawler_setting: "爬虫设置",
      task: "分析任务",
      report_share: "报告分享"
    }[type] || type
  );
}

function metadataText(value: unknown) {
  if (!value) {
    return "-";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function metadataSummary(value: unknown) {
  const text = metadataText(value).replace(/\s+/g, " ").trim();
  if (!text || text === "-") {
    return "-";
  }
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

async function saveUser(record: AdminUserDTO, patch: { isSuperAdmin?: boolean; isActive?: boolean }, successMessage = "用户权限已更新") {
  savingUserId.value = record.id;
  try {
    const updated = await updateAdminUser(record.id, patch);
    users.value = users.value.map((item) => (item.id === updated.id ? updated : item));
    await loadAuditLogs();
    message.success(successMessage);
  } catch (error) {
    message.error(readErrorMessage(error, "用户信息更新失败"));
  } finally {
    savingUserId.value = "";
  }
}

async function resetPassword(record: AdminUserDTO) {
  savingUserId.value = record.id;
  try {
    const result = await resetAdminUserPassword(record.id);
    await loadAuditLogs();
    message.success(`密码已重置为 ${result.password}`);
  } catch (error) {
    message.error(readErrorMessage(error, "密码重置失败"));
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
    await loadAuditLogs();
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
    message.success("用户已保存，初始密码为 123456");
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
  const copied = await copyTextToClipboard(code);
  if (copied) {
    message.success("邀请码已复制");
  } else {
    message.warning("浏览器未允许自动复制，请手动复制邀请码。");
  }
}

function reviewPercent(record: AdminUserDTO) {
  if (!record.monthlyReviewLimit) {
    return 0;
  }
  return Math.min(Math.round((record.currentPeriodReviewCount / record.monthlyReviewLimit) * 100), 100);
}

onMounted(load);
</script>
