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
          <div class="table-title workload-title">数据库任务健康</div>
          <div class="summary-grid">
            <div
              v-for="workload in queueHealth?.workloads || []"
              :key="workload.name"
              class="stat-card"
              :class="workload.stalled || workload.failed ? 'stat-card-alert' : 'stat-card-success'"
            >
              <div class="stat-label">{{ workload.label }}</div>
              <div class="stat-value">{{ workload.queued + workload.running }}</div>
              <div class="stat-note">
                排队 {{ workload.queued }} · 运行 {{ workload.running }} · 失败 {{ workload.failed }} · 疑似卡住 {{ workload.stalled }}
              </div>
              <div class="member-email">最早活跃：{{ formatTime(workload.oldestActiveCreatedAt) }}</div>
              <div class="member-email">最近失败：{{ formatTime(workload.lastFailureAt) }}</div>
              <a-tag :color="workloadStatusColor(workload)">
                {{ workloadStatusLabel(workload) }}
              </a-tag>
            </div>
          </div>
          <div class="table-title workload-title">疑似卡住任务</div>
          <a-table
            :columns="stalledColumns"
            :data-source="queueHealth?.stalledItems || []"
            :loading="loading"
            row-key="id"
            :pagination="{ pageSize: 8 }"
            :scroll="{ x: 1520 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'kind'">
                <a-tag :color="failureKindColor(record.kind)">{{ failureKindLabel(record.kind) }}</a-tag>
                <div class="member-email">{{ record.status }}</div>
              </template>
              <template v-else-if="column.key === 'target'">
                <div>{{ record.label }}</div>
                <div class="member-email">{{ record.taskName || record.taskId || record.id }}</div>
              </template>
              <template v-else-if="column.key === 'workspace'">
                <div>{{ record.workspaceName || record.workspaceSlug || record.workspaceId || "-" }}</div>
                <div class="member-email">{{ record.workspaceSlug || record.workspaceId || "-" }}</div>
              </template>
              <template v-else-if="column.key === 'context'">
                <div>{{ record.sourceChannel || "-" }}</div>
                <div class="member-email">{{ record.modelName || "-" }}</div>
              </template>
              <template v-else-if="column.key === 'progress'">
                <a-progress :percent="record.progressPercent" size="small" :status="record.kind === 'crawl' ? 'active' : 'normal'" />
                <div class="member-email">{{ record.detail }}</div>
              </template>
              <template v-else-if="column.key === 'diagnosis'">
                <div class="stalled-diagnosis-cell">
                  <a-tag :color="stalledDiagnosisColor(record)">{{ record.diagnosis }}</a-tag>
                  <div class="member-email">{{ record.nextAction }}</div>
                  <div v-if="record.metricSummary" class="member-email">{{ record.metricSummary }}</div>
                  <a-tooltip v-if="record.lastError" :title="record.lastError">
                    <div class="member-email error-summary">最近错误：{{ errorSummary(record.lastError) }}</div>
                  </a-tooltip>
                </div>
              </template>
              <template v-else-if="column.key === 'activity'">
                <div>{{ formatTime(record.lastActivityAt) }}</div>
                <div class="member-email">已静默 {{ durationLabel(record.ageSeconds) }}</div>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button size="small" type="link" :disabled="!canOpenQueueContext(record)" @click="openQueueContext(record)">
                  {{ queueContextActionLabel(record) }}
                </a-button>
              </template>
            </template>
          </a-table>
          <div class="table-title workload-title">最近失败任务</div>
          <a-table
            :columns="failureColumns"
            :data-source="queueHealth?.recentFailures || []"
            :loading="loading"
            row-key="id"
            :pagination="{ pageSize: 8 }"
            :scroll="{ x: 1400 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'kind'">
                <a-tag :color="failureKindColor(record.kind)">{{ failureKindLabel(record.kind) }}</a-tag>
                <div class="member-email">{{ record.status }}</div>
              </template>
              <template v-else-if="column.key === 'target'">
                <div>{{ record.label }}</div>
                <div class="member-email">{{ record.taskName || record.taskId || record.id }}</div>
              </template>
              <template v-else-if="column.key === 'workspace'">
                <div>{{ record.workspaceName || record.workspaceSlug || record.workspaceId || "-" }}</div>
                <div class="member-email">{{ record.workspaceSlug || record.workspaceId || "-" }}</div>
              </template>
              <template v-else-if="column.key === 'context'">
                <div>{{ record.sourceChannel || "-" }}</div>
                <div class="member-email">{{ record.modelName || "-" }}</div>
              </template>
              <template v-else-if="column.key === 'error'">
                <a-tooltip :title="record.error || '-'">
                  <span class="muted">{{ errorSummary(record.error) }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.key === 'time'">
                {{ formatTime(record.failedAt) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space size="small">
                  <a-button size="small" type="link" :disabled="!canOpenQueueContext(record)" @click="openQueueContext(record)">
                    {{ queueContextActionLabel(record) }}
                  </a-button>
                  <a-button
                    v-if="canRetryQueueCrawl(record)"
                    size="small"
                    type="link"
                    :loading="queueRetryingId === record.id"
                    @click="retryQueueCrawl(record)"
                  >
                    重新采集
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
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
import { onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { ArrowLeftOutlined, KeyOutlined, ReloadOutlined, UserAddOutlined } from "@ant-design/icons-vue";
import axios from "axios";
import type { Dayjs } from "dayjs";
import type {
  AdminOverviewDTO,
  AdminUserDTO,
  AuditLogDTO,
  InviteCodeDTO,
  QueueFailureDTO,
  QueueHealthDTO,
  QueueStalledDTO,
  WorkloadHealthSnapshotDTO
} from "@review-ai/shared";
import {
  fetchAdminAuditLogs,
  fetchAdminQueueHealth,
  createAdminUser,
  createInviteCode,
  fetchAdminOverview,
  fetchAdminUsers,
  fetchInviteCodes,
  retryCrawlJob,
  resetAdminUserPassword,
  updateAdminUser
} from "@/api";
import { useTaskStore } from "@/composables";
import { copyTextToClipboard } from "@/utils/clipboard";

const loading = ref(false);
const router = useRouter();
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
const queueRetryingId = ref("");
const quotaDrafts = reactive<Record<string, { monthlyReviewLimit: number; monthlyRunLimit: number }>>({});
const { currentUser } = useTaskStore();
let queueHealthTimer: ReturnType<typeof setInterval> | null = null;
let queueHealthRefreshing = false;

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

const failureColumns = [
  { title: "类型", key: "kind", width: 130 },
  { title: "失败对象", key: "target", width: 280 },
  { title: "空间", key: "workspace", width: 210 },
  { title: "渠道/模型", key: "context", width: 180 },
  { title: "错误摘要", key: "error", width: 280 },
  { title: "失败时间", key: "time", width: 190 },
  { title: "操作", key: "actions", width: 190, fixed: "right" }
];

const stalledColumns = [
  { title: "类型", key: "kind", width: 130 },
  { title: "任务对象", key: "target", width: 280 },
  { title: "空间", key: "workspace", width: 210 },
  { title: "渠道/模型", key: "context", width: 180 },
  { title: "进度", key: "progress", width: 240 },
  { title: "诊断建议", key: "diagnosis", width: 360 },
  { title: "最后活动", key: "activity", width: 190 },
  { title: "操作", key: "actions", width: 130, fixed: "right" }
];

async function loadAuditLogs() {
  auditLogs.value = await fetchAdminAuditLogs({ limit: 120 });
}

async function loadQueueHealth() {
  queueHealth.value = await fetchAdminQueueHealth();
}

async function refreshQueueHealthSilently() {
  if (queueHealthRefreshing || forbidden.value) {
    return;
  }
  queueHealthRefreshing = true;
  try {
    await loadQueueHealth();
  } catch {
    // Full-page refresh still surfaces errors; polling should stay quiet.
  } finally {
    queueHealthRefreshing = false;
  }
}

function stopQueueHealthPolling() {
  if (queueHealthTimer) {
    clearInterval(queueHealthTimer);
    queueHealthTimer = null;
  }
}

function startQueueHealthPolling() {
  if (queueHealthTimer || activeTab.value !== "queues" || forbidden.value) {
    return;
  }
  refreshQueueHealthSilently();
  queueHealthTimer = setInterval(refreshQueueHealthSilently, 10000);
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

function durationLabel(seconds?: number | null) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  if (totalSeconds < 60) {
    return `${totalSeconds} 秒`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时 ${minutes % 60} 分钟`;
  }
  const days = Math.floor(hours / 24);
  return `${days} 天 ${hours % 24} 小时`;
}

type QueueItemKind = QueueFailureDTO["kind"] | QueueStalledDTO["kind"];
type QueueHealthItem = QueueFailureDTO | QueueStalledDTO;

function failureKindLabel(kind: QueueItemKind) {
  return kind === "crawl" ? "采集" : "分析";
}

function failureKindColor(kind: QueueItemKind) {
  return kind === "crawl" ? "orange" : "purple";
}

function queueContextActionLabel(record: QueueHealthItem) {
  return record.kind === "crawl" ? "打开采集" : "查看分析";
}

function canOpenQueueContext(record: QueueHealthItem) {
  return record.kind === "crawl" || Boolean(record.taskId);
}

function canRetryQueueCrawl(record: QueueHealthItem) {
  return record.kind === "crawl" && record.status === "failed";
}

function openQueueContext(record: QueueHealthItem) {
  if (record.kind === "crawl") {
    router.push({ path: "/crawl-jobs", query: { jobId: record.id } });
    return;
  }
  if (record.taskId) {
    router.push({ path: `/tasks/${record.taskId}/runs`, query: { runId: record.id } });
  }
}

async function retryQueueCrawl(record: QueueHealthItem) {
  if (!canRetryQueueCrawl(record) || queueRetryingId.value) {
    return;
  }
  queueRetryingId.value = record.id;
  try {
    await retryCrawlJob(record.id);
    message.success("采集任务已重新加入队列");
    await loadQueueHealth();
    await loadAuditLogs();
  } catch (error) {
    message.error(readErrorMessage(error, "采集任务重试失败"));
  } finally {
    queueRetryingId.value = "";
  }
}

function errorSummary(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) {
    return "-";
  }
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

function stalledDiagnosisColor(record: QueueStalledDTO) {
  if (record.lastError) {
    return "red";
  }
  if (/未|无|超过|超时|阻塞|静默/.test(record.diagnosis)) {
    return "orange";
  }
  return record.kind === "crawl" ? "blue" : "purple";
}

function workloadStatusColor(workload: WorkloadHealthSnapshotDTO) {
  if (workload.stalled) {
    return "orange";
  }
  if (workload.failed) {
    return "red";
  }
  if (workload.queued || workload.running) {
    return "blue";
  }
  return "green";
}

function workloadStatusLabel(workload: WorkloadHealthSnapshotDTO) {
  if (workload.stalled) {
    return "需要检查";
  }
  if (workload.failed) {
    return "有失败记录";
  }
  if (workload.queued || workload.running) {
    return "处理中";
  }
  return "空闲";
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
      "crawl_job.create": "创建采集任务",
      "crawl_job.start_analysis": "采集启动分析",
      "crawl_job.retry": "重试采集任务",
      "crawl_job.delete": "删除采集任务",
      "crawl_monitor.create": "创建监听任务",
      "crawl_monitor.update": "更新监听任务",
      "crawl_monitor.run_now": "手动运行监听",
      "crawl_monitor.delete": "删除监听任务",
      "analysis_run.create": "创建分析批次",
      "analysis_run.cancel": "取消分析批次",
      "review_correction.create": "创建 AI 纠错",
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
      crawl_job: "采集任务",
      crawl_monitor: "监听任务",
      analysis_run: "分析批次",
      review_correction: "AI 纠错",
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

watch(activeTab, (tab) => {
  if (tab === "queues") {
    startQueueHealthPolling();
  } else {
    stopQueueHealthPolling();
  }
});

onMounted(async () => {
  await load();
  startQueueHealthPolling();
});

onUnmounted(stopQueueHealthPolling);
</script>

<style scoped>
.workload-title {
  margin-top: 18px;
}

.stalled-diagnosis-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.stalled-diagnosis-cell :deep(.ant-tag) {
  justify-self: start;
  margin-inline-end: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-summary {
  color: #b91c1c;
}
</style>
