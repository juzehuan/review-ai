<template>
  <div class="review-page">
    <div class="toolbar review-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">用户评论（AI分析）</div>
        <div class="toolbar-subtitle">支持筛选、分组、视图保存、默认视图与明细抽屉，更接近多维表工作流。</div>
      </div>

      <div class="view-strip">
        <div
          v-for="view in savedViews"
          :key="view.id"
          class="view-pill"
          :class="{ 'view-pill-active': activeViewId === view.id }"
          @click="applySavedView(view.id)"
        >
          <span>{{ view.name }}</span>
          <span v-if="view.isDefault" class="view-pill-badge">默认</span>
          <a-popconfirm
            v-if="!view.isDefault"
            title="删除此视图？"
            ok-text="删除"
            cancel-text="取消"
            @confirm.stop="deleteView(view.id)"
          >
            <span class="view-pill-del" @click.stop><CloseOutlined /></span>
          </a-popconfirm>
        </div>
        <div class="view-pill view-pill-ghost" @click="clearActiveView">当前临时视图</div>
      </div>
    </div>

    <div class="toolbar review-controls">
      <a-space wrap>
        <a-select v-model:value="filters.ratingStar" allow-clear placeholder="星级" style="width: 120px">
          <a-select-option v-for="star in [1, 2, 3, 4, 5]" :key="star" :value="star">{{ star }} 星</a-select-option>
        </a-select>

        <a-select v-model:value="filters.sentiment" allow-clear placeholder="情感" style="width: 140px">
          <a-select-option value="positive">正向</a-select-option>
          <a-select-option value="neutral">中性</a-select-option>
          <a-select-option value="negative">负向</a-select-option>
        </a-select>

        <a-select v-model:value="filters.hasMedia" allow-clear placeholder="是否有媒体" style="width: 140px">
          <a-select-option :value="true">有图/视频</a-select-option>
          <a-select-option :value="false">纯文本</a-select-option>
        </a-select>

        <a-tooltip title="搜索评论内容、翻译文本及 AI 打标标签">
          <a-input v-model:value="filters.keyword" placeholder="关键词或标签" style="width: 220px" />
        </a-tooltip>

        <a-tooltip title="只显示 AI 标记为需要关注的评论（差评/低星）">
          <a-switch v-model:checked="filters.needsAttention" checked-children="需关注" un-checked-children="全部" />
        </a-tooltip>

        <a-select v-model:value="groupBy" style="width: 160px">
          <a-select-option value="sentiment">按情感分组</a-select-option>
          <a-select-option value="ratingStar">按星级分组</a-select-option>
          <a-select-option value="analysisTag">按 AI 标签分组</a-select-option>
        </a-select>

        <a-segmented v-model:value="viewMode" :options="viewOptions" />

        <a-dropdown>
          <a-button>
            <template #icon><SettingOutlined /></template>
            列显隐
          </a-button>
          <template #overlay>
            <div class="column-menu">
              <a-checkbox-group v-model:value="visibleColumnKeys" :options="columnOptions" />
            </div>
          </template>
        </a-dropdown>

        <a-button @click="loadReviews">筛选</a-button>
        <a-button @click="resetFilters">重置</a-button>
        <a-button @click="loadRuns">刷新状态</a-button>
        <a-button @click="saveCurrentView">
          <template #icon><SaveOutlined /></template>
          保存视图
        </a-button>
        <a-button @click="setCurrentAsDefault" :disabled="!activeViewId">
          <template #icon><StarOutlined /></template>
          设为默认
        </a-button>
        <a-button @click="handleExport" :loading="exporting">
          <template #icon><DownloadOutlined /></template>
          导出 CSV
        </a-button>
        <!-- 分析中：详细进度 + 停止按钮 -->
        <template v-if="latestRun && analysisProgress && ['queued', 'running'].includes(latestRun.status)">
          <div class="analysis-progress-block">
            <div class="analysis-progress-label">
              <a-tag :color="runStatusColor(latestRun.status)">{{ runStatusLabel(latestRun.status) }}</a-tag>
              <span class="progress-text">
                {{ analysisProgress.processed }} / {{ analysisProgress.total }} 条 ({{ analysisProgress.percent }}%)
              </span>
            </div>
            <a-progress
              :percent="analysisProgress.percent"
              :status="latestRun.status === 'running' ? 'active' : 'normal'"
              size="small"
              style="width: 280px"
            />
            <div class="analysis-progress-meta">
              <span class="meta-success">✓ 成功 {{ analysisProgress.success }}</span>
              <span class="meta-failed">✗ 失败 {{ analysisProgress.failed }}</span>
              <span class="meta-remaining">剩 {{ analysisProgress.remaining }}</span>
              <span v-if="analysisProgress.ratePerMin !== null" class="meta-rate">
                · {{ analysisProgress.ratePerMin }} 条/分
              </span>
              <span class="meta-time">
                · 已用 {{ formatDuration(analysisProgress.elapsedSec) }}
                <template v-if="analysisProgress.etaSec !== null">
                  · 剩 {{ formatDuration(analysisProgress.etaSec) }}
                </template>
              </span>
            </div>
            <a-tooltip
              v-if="latestRun.failedCount > 0 && latestRun.lastError"
              :title="latestRun.lastError"
              placement="bottomRight"
            >
              <div class="analysis-progress-error">⚠ 最近错误：{{ latestRun.lastError.slice(0, 60) }}{{ latestRun.lastError.length > 60 ? '…' : '' }}</div>
            </a-tooltip>
          </div>
          <a-popconfirm
            title="确认停止当前分析任务？已分析的结果会保留。"
            ok-text="停止"
            ok-type="danger"
            cancel-text="取消"
            @confirm="stopAnalysis"
          >
            <a-button danger :loading="stopping">
              <template #icon><StopOutlined /></template>
              停止分析
            </a-button>
          </a-popconfirm>
        </template>

        <!-- 无分析中：发起/重新分析按钮 + 状态 -->
        <template v-else>
          <a-button type="primary" @click="runAnalysis" :loading="running">
            <template #icon><RobotOutlined /></template>
            {{ latestRun ? '重新分析' : '发起分析' }}
          </a-button>
          <template v-if="latestRun">
            <div class="analysis-status-block">
              <a-tag :color="runStatusColor(latestRun.status)">
                最新分析：{{ runStatusLabel(latestRun.status) }}
              </a-tag>
              <a-tooltip
                v-if="latestRun.failedCount > 0 && latestRun.lastError"
                :title="latestRun.lastError"
                placement="bottomRight"
              >
                <a-tag color="error" style="cursor: pointer">
                  ⚠ {{ latestRun.failedCount }} 条失败 — 查看原因
                </a-tag>
              </a-tooltip>
              <a-tag v-else-if="latestRun.failedCount > 0" color="warning">
                {{ latestRun.failedCount }} 条失败
              </a-tag>
            </div>
          </template>
          <a-tag v-else color="default">尚未分析</a-tag>
        </template>
      </a-space>
    </div>

    <div class="review-stats-grid">
      <div class="mini-stat-card mini-stat-warm">
        <div class="mini-stat-label">筛选结果</div>
        <div class="mini-stat-value">{{ totalCount }}</div>
      </div>
      <div class="mini-stat-card mini-stat-cool">
        <div class="mini-stat-label">需关注评论</div>
        <div class="mini-stat-value">{{ attentionCount }}</div>
      </div>
      <div class="mini-stat-card mini-stat-ink">
        <div class="mini-stat-label">带媒体评论</div>
        <div class="mini-stat-value">{{ mediaCount }}</div>
      </div>
      <div class="mini-stat-card mini-stat-alert">
        <div class="mini-stat-label">负向评论</div>
        <div class="mini-stat-value">{{ negativeCount }}</div>
      </div>
    </div>

    <div v-if="viewMode === 'table'" class="table-shell">
      <a-table
        :columns="visibleColumns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
        :scroll="{ x: 1600 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ratingStar'">
            <a-rate :value="record.ratingStar" disabled style="font-size: 13px" />
          </template>
          <template v-else-if="column.key === 'analysisTags'">
            <a-tooltip
              v-if="record.analysisTags && record.analysisTags.length"
              :title="record.analysisTags.join(' · ')"
              placement="topLeft"
            >
              <span class="cell-tags">
                <a-tag v-for="tag in record.analysisTags.slice(0, 2)" :key="tag" class="cell-tag-item">{{ tag }}</a-tag>
                <a-tag v-if="record.analysisTags.length > 2" class="cell-tag-more">+{{ record.analysisTags.length - 2 }}</a-tag>
              </span>
            </a-tooltip>
            <span v-else class="cell-empty">—</span>
          </template>
          <template v-else-if="column.key === 'sentiment'">
            <span class="cell-tags">
              <a-tag :color="sentimentColor(record.sentiment)">{{ sentimentLabel(record.sentiment) }}</a-tag>
              <a-tag v-if="record.needsAttention" color="red">关注</a-tag>
            </span>
          </template>
          <template v-else-if="column.key === 'comment'">
            <a-tooltip :title="record.comment" placement="topLeft" overlay-class-name="cell-tooltip-wide">
              <a class="cell-comment-link" @click="selectedRow = record">{{ record.comment || '—' }}</a>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'hasMedia'">
            <a-tag :color="record.hasMedia ? 'blue' : 'default'">{{ record.hasMedia ? "有" : "无" }}</a-tag>
          </template>
          <template v-else-if="column.key === 'cmtId' || column.key === 'productName' || column.key === 'variantName' || column.key === 'commentTime' || column.key === 'sourceChannel'">
            <a-tooltip :title="record[column.key] || ''" placement="topLeft">
              <span>{{ record[column.key] || '—' }}</span>
            </a-tooltip>
          </template>
        </template>
      </a-table>
    </div>

    <div v-else class="group-list">
      <div v-for="group in groupedRows" :key="group.key" class="group-card">
        <div class="group-header">
          <div>
            <div class="group-title">{{ group.label }}</div>
            <div class="group-subtitle">共 {{ group.items.length }} 条评论</div>
          </div>
          <a-tag color="blue">{{ group.label }}</a-tag>
        </div>

        <div class="group-items">
          <div
            v-for="item in group.expanded ? group.items : group.items.slice(0, 6)"
            :key="item.id"
            class="group-item"
            @click="selectedRow = item"
          >
            <div class="group-item-top">
              <span>{{ item.commentTime || "-" }}</span>
              <a-rate :value="item.ratingStar" disabled />
            </div>
            <div class="group-item-summary">{{ item.summary || truncate(item.comment, 90) }}</div>
            <div class="group-item-tags">
              <a-tag :color="sentimentColor(item.sentiment)">{{ sentimentLabel(item.sentiment) }}</a-tag>
              <a-tag v-if="item.needsAttention" color="red">需关注</a-tag>
              <a-tag v-for="tag in item.analysisTags.slice(0, 3)" :key="tag">{{ tag }}</a-tag>
            </div>
          </div>
        </div>

        <div v-if="group.items.length > 6" class="group-more">
          <a-button type="link" size="small" @click="group.expanded = !group.expanded">
            {{ group.expanded ? "收起" : `查看全部 ${group.items.length} 条` }}
          </a-button>
        </div>
      </div>
    </div>

    <!-- 评论详情抽屉 -->
    <a-drawer :open="Boolean(selectedRow)" width="680" title="评论详情" @close="selectedRow = null">
      <template v-if="selectedRow">
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item label="评论 ID">{{ selectedRow.cmtId }}</a-descriptions-item>
          <a-descriptions-item label="评分">
            <a-rate :value="selectedRow.ratingStar" disabled />
          </a-descriptions-item>
          <a-descriptions-item label="规格">{{ selectedRow.variantName || "-" }}</a-descriptions-item>
          <a-descriptions-item label="来源">{{ selectedRow.sourceChannel }}</a-descriptions-item>
          <a-descriptions-item label="评论时间">{{ selectedRow.commentTime || "-" }}</a-descriptions-item>
          <a-descriptions-item label="有无媒体">{{ selectedRow.hasMedia ? "有" : "无" }}</a-descriptions-item>
          <a-descriptions-item label="需要关注">
            <a-tag :color="selectedRow.needsAttention ? 'red' : 'default'">
              {{ selectedRow.needsAttention ? "是" : "否" }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="原始评论">{{ selectedRow.comment }}</a-descriptions-item>
          <a-descriptions-item label="翻译评论">{{ selectedRow.commentTr || "-" }}</a-descriptions-item>
          <a-descriptions-item label="AI 摘要">{{ selectedRow.summary || "-" }}</a-descriptions-item>
          <a-descriptions-item label="AI 情感">
            <a-tag :color="sentimentColor(selectedRow.sentiment)">{{ sentimentLabel(selectedRow.sentiment) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="AI 标签">{{ selectedRow.analysisTags.join("、") || "-" }}</a-descriptions-item>
          <a-descriptions-item label="关键词">{{ selectedRow.keywords.join("、") || "-" }}</a-descriptions-item>
          <a-descriptions-item label="问题点">{{ selectedRow.painPoints.join("、") || "-" }}</a-descriptions-item>
          <a-descriptions-item label="亮点">{{ selectedRow.highlights.join("、") || "-" }}</a-descriptions-item>
          <a-descriptions-item label="AI 建议">{{ selectedRow.suggestion || "-" }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-drawer>

    <!-- 保存视图弹窗 -->
    <a-modal
      :open="saveViewModalOpen"
      title="保存筛选视图"
      ok-text="保存"
      cancel-text="取消"
      @ok="confirmSaveView"
      @cancel="saveViewModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="视图名称">
          <a-input v-model:value="pendingViewName" placeholder="例如：负向问题评论 / 5 星好评 / 带图评论" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, reactive, ref, watch } from "vue";
import { Modal, message } from "ant-design-vue";
import {
  CloseOutlined,
  DownloadOutlined,
  RobotOutlined,
  SaveOutlined,
  SettingOutlined,
  StarOutlined,
  StopOutlined
} from "@ant-design/icons-vue";
import type { AnalysisRunDTO, ReviewRowDTO, Sentiment } from "@review-ai/shared";
import { buildExportUrl, cancelRun, createRun, fetchReviews, fetchRuns } from "@/api";
import { useRoute, useRouter } from "vue-router";

type PaginationConfig = { current?: number; pageSize?: number; total?: number };
type SorterConfig = { field?: string; order?: "ascend" | "descend" };
type ColumnKey =
  | "cmtId"
  | "productName"
  | "variantName"
  | "comment"
  | "commentTime"
  | "ratingStar"
  | "sourceChannel"
  | "hasMedia"
  | "analysisTags"
  | "sentiment";

type SavedView = {
  id: string;
  name: string;
  isDefault: boolean;
  filters: {
    ratingStar?: number;
    sentiment?: string;
    hasMedia?: boolean;
    keyword: string;
    needsAttention: boolean;
  };
  groupBy: "sentiment" | "ratingStar" | "analysisTag";
  viewMode: "table" | "grouped";
  sortBy: string;
  sortOrder: "asc" | "desc";
  visibleColumnKeys: ColumnKey[];
};

type GroupRow = {
  key: string;
  label: string;
  items: ReviewRowDTO[];
  expanded: boolean;
};

const DEFAULT_VIEW_ID = "all-comments";

const route = useRoute();
const router = useRouter();
const taskId = computed(() => route.params.taskId as string);
const nowTick = ref(Date.now());
let nowTimer: ReturnType<typeof setInterval> | null = null;
const loading = ref(false);
const running = ref(false);
const stopping = ref(false);
const exporting = ref(false);
const rows = ref<ReviewRowDTO[]>([]);
const latestRun = ref<AnalysisRunDTO | null>(null);
const selectedRow = ref<ReviewRowDTO | null>(null);
const saveViewModalOpen = ref(false);
const pendingViewName = ref("");
const activeViewId = ref<string>("");
const savedViews = ref<SavedView[]>([]);
const pagination = reactive<PaginationConfig>({ current: 1, pageSize: 10, total: 0 });

const filters = reactive({
  ratingStar: undefined as number | undefined,
  sentiment: undefined as string | undefined,
  hasMedia: undefined as boolean | undefined,
  keyword: "",
  needsAttention: false
});

const viewMode = ref<"table" | "grouped">("table");
const groupBy = ref<"sentiment" | "ratingStar" | "analysisTag">("sentiment");
const sortState = reactive({ sortBy: "commentTime", sortOrder: "desc" as "asc" | "desc" });
const viewOptions = [
  { label: "表格", value: "table" },
  { label: "分组", value: "grouped" }
];

const allColumns = [
  { title: "编号", dataIndex: "cmtId", key: "cmtId", width: 140, ellipsis: { showTitle: false } },
  { title: "商品名称", dataIndex: "productName", key: "productName", width: 200, ellipsis: { showTitle: false } },
  { title: "规格/颜色", dataIndex: "variantName", key: "variantName", width: 130, ellipsis: { showTitle: false } },
  { title: "用户评价", dataIndex: "comment", key: "comment", width: 320, ellipsis: { showTitle: false } },
  { title: "评论时间", dataIndex: "commentTime", key: "commentTime", width: 160, sorter: true, ellipsis: { showTitle: false } },
  { title: "评级", dataIndex: "ratingStar", key: "ratingStar", width: 150, sorter: true },
  { title: "反馈渠道", dataIndex: "sourceChannel", key: "sourceChannel", width: 110, ellipsis: { showTitle: false } },
  { title: "是否有媒体", dataIndex: "hasMedia", key: "hasMedia", width: 100 },
  { title: "反馈 AI 打标", dataIndex: "analysisTags", key: "analysisTags", width: 220, ellipsis: { showTitle: false } },
  { title: "AI 情感分析", dataIndex: "sentiment", key: "sentiment", width: 160, sorter: true }
] as const;

const columnOptions = allColumns.map((c) => ({ label: c.title, value: c.key }));
const visibleColumnKeys = ref<ColumnKey[]>(allColumns.map((c) => c.key));
const totalCount = computed(() => pagination.total || 0);
const mediaCount = computed(() => rows.value.filter((r) => r.hasMedia).length);
const negativeCount = computed(() => rows.value.filter((r) => r.sentiment === "negative").length);
const attentionCount = computed(() => rows.value.filter((r) => r.needsAttention).length);

let pollTimer: ReturnType<typeof setInterval> | null = null;
const applyingSavedView = ref(false);

const visibleColumns = computed(() =>
  allColumns.filter((c) => visibleColumnKeys.value.includes(c.key as ColumnKey))
);

const groupedRows = computed<GroupRow[]>(() => {
  const groups = new Map<string, GroupRow>();
  for (const row of rows.value) {
    if (groupBy.value === "sentiment") {
      const key = row.sentiment || "unknown";
      const label = sentimentLabel(row.sentiment);
      if (!groups.has(key)) groups.set(key, { key, label, items: [], expanded: false });
      groups.get(key)!.items.push(row);
    } else if (groupBy.value === "ratingStar") {
      const key = String(row.ratingStar);
      const label = `${row.ratingStar} 星`;
      if (!groups.has(key)) groups.set(key, { key, label, items: [], expanded: false });
      groups.get(key)!.items.push(row);
    } else {
      const tags = row.analysisTags.length ? row.analysisTags : ["未打标"];
      for (const tag of tags) {
        if (!groups.has(tag)) groups.set(tag, { key: tag, label: tag, items: [], expanded: false });
        groups.get(tag)!.items.push(row);
      }
    }
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length);
});

function storageKey(taskId: string) {
  return `review-ai:saved-views:${taskId}`;
}

function buildDefaultView(): SavedView {
  return {
    id: DEFAULT_VIEW_ID,
    name: "全部评论",
    isDefault: true,
    filters: { keyword: "", needsAttention: false },
    groupBy: "sentiment",
    viewMode: "table",
    sortBy: "commentTime",
    sortOrder: "desc",
    visibleColumnKeys: allColumns.map((c) => c.key)
  };
}

function snapshotCurrentView(name: string, id?: string): SavedView {
  return {
    id: id || `view-${Date.now()}`,
    name,
    isDefault: false,
    filters: {
      ratingStar: filters.ratingStar,
      sentiment: filters.sentiment,
      hasMedia: filters.hasMedia,
      keyword: filters.keyword,
      needsAttention: filters.needsAttention
    },
    groupBy: groupBy.value,
    viewMode: viewMode.value,
    sortBy: sortState.sortBy,
    sortOrder: sortState.sortOrder,
    visibleColumnKeys: [...visibleColumnKeys.value]
  };
}

function loadSavedViews(taskId: string) {
  const raw = window.localStorage.getItem(storageKey(taskId));
  if (!raw) {
    savedViews.value = [buildDefaultView()];
    activeViewId.value = DEFAULT_VIEW_ID;
    return;
  }
  try {
    const parsed = JSON.parse(raw) as SavedView[];
    savedViews.value = parsed.length ? parsed : [buildDefaultView()];
    const defaultView = savedViews.value.find((v) => v.isDefault) || savedViews.value[0];
    activeViewId.value = defaultView.id;
    applyView(defaultView);
  } catch {
    savedViews.value = [buildDefaultView()];
    activeViewId.value = DEFAULT_VIEW_ID;
  }
}

function persistSavedViews() {
  if (!taskId.value) return;
  window.localStorage.setItem(storageKey(taskId.value), JSON.stringify(savedViews.value));
}

function applyView(view: SavedView) {
  applyingSavedView.value = true;
  filters.ratingStar = view.filters.ratingStar;
  filters.sentiment = view.filters.sentiment;
  filters.hasMedia = view.filters.hasMedia;
  filters.keyword = view.filters.keyword;
  filters.needsAttention = view.filters.needsAttention ?? false;
  groupBy.value = view.groupBy;
  viewMode.value = view.viewMode;
  sortState.sortBy = view.sortBy;
  sortState.sortOrder = view.sortOrder;
  visibleColumnKeys.value = [...view.visibleColumnKeys];
  queueMicrotask(() => {
    applyingSavedView.value = false;
  });
}

function applySavedView(viewId: string) {
  const view = savedViews.value.find((v) => v.id === viewId);
  if (!view) return;
  activeViewId.value = view.id;
  applyView(view);
  pagination.current = 1;
  loadReviews();
}

function clearActiveView() {
  activeViewId.value = "";
}

function saveCurrentView() {
  pendingViewName.value = "";
  saveViewModalOpen.value = true;
}

function confirmSaveView() {
  if (!pendingViewName.value.trim()) {
    message.error("请输入视图名称。");
    return;
  }
  const nextView = snapshotCurrentView(pendingViewName.value.trim());
  savedViews.value = savedViews.value.filter((v) => v.id !== nextView.id);
  savedViews.value.push(nextView);
  activeViewId.value = nextView.id;
  persistSavedViews();
  saveViewModalOpen.value = false;
  pendingViewName.value = "";
  message.success("视图已保存。");
}

function setCurrentAsDefault() {
  if (!activeViewId.value) {
    message.warning("请先选择一个已保存视图。");
    return;
  }
  savedViews.value = savedViews.value.map((v) => ({ ...v, isDefault: v.id === activeViewId.value }));
  persistSavedViews();
  message.success("默认视图已更新。");
}

function deleteView(viewId: string) {
  savedViews.value = savedViews.value.filter((v) => v.id !== viewId);
  if (activeViewId.value === viewId) activeViewId.value = "";
  persistSavedViews();
  message.success("视图已删除。");
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function sentimentLabel(value: Sentiment | null) {
  if (value === "positive") return "正向";
  if (value === "negative") return "负向";
  if (value === "neutral") return "中性";
  return "未分析";
}

function sentimentColor(value: Sentiment | null) {
  if (value === "positive") return "green";
  if (value === "negative") return "red";
  if (value === "neutral") return "gold";
  return "default";
}

function runStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    running: "分析中",
    queued: "排队中",
    completed: "已完成",
    partial_failed: "部分失败",
    failed: "失败"
  };
  return map[status || ""] || "未知";
}

async function stopAnalysis() {
  if (!taskId.value || !latestRun.value) return;
  stopping.value = true;
  try {
    await cancelRun(taskId.value, latestRun.value.id);
    message.success("分析任务已停止，已分析的结果已保留。");
    await loadRuns();
  } catch {
    message.error("停止失败，请重试。");
  } finally {
    stopping.value = false;
  }
}

function runStatusColor(status?: string | null) {
  if (status === "running" || status === "queued") return "processing";
  if (status === "completed") return "success";
  if (status === "partial_failed") return "warning";
  if (status === "failed") return "error";
  return "default";
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (nowTimer) {
    clearInterval(nowTimer);
    nowTimer = null;
  }
}

async function loadRuns() {
  if (!taskId.value) {
    latestRun.value = null;
    return;
  }
  const runs = await fetchRuns(taskId.value);
  latestRun.value = runs[0] || null;

  if (latestRun.value && ["queued", "running"].includes(latestRun.value.status)) {
    running.value = true;
    if (!pollTimer) {
      pollTimer = setInterval(async () => {
        await loadRuns();
        await loadReviews();
        if (!latestRun.value || !["queued", "running"].includes(latestRun.value.status)) {
          running.value = false;
          stopPolling();
          message.success("分析已完成，列表已刷新。");
        }
      }, 2000);
    }
    if (!nowTimer) {
      nowTick.value = Date.now();
      nowTimer = setInterval(() => { nowTick.value = Date.now(); }, 1000);
    }
  } else {
    running.value = false;
    stopPolling();
  }
}

const analysisProgress = computed(() => {
  const run = latestRun.value;
  if (!run) return null;
  const total = run.reviewCount || 0;
  const success = run.successCount || 0;
  const failed = run.failedCount || 0;
  const processed = success + failed;
  const remaining = Math.max(0, total - processed);
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  let elapsedSec = 0;
  let etaSec: number | null = null;
  let ratePerMin: number | null = null;
  if (run.startedAt) {
    const startMs = new Date(run.startedAt).getTime();
    elapsedSec = Math.max(0, Math.round((nowTick.value - startMs) / 1000));
    if (processed > 0 && elapsedSec > 0) {
      const ratePerSec = processed / elapsedSec;
      ratePerMin = Math.round(ratePerSec * 60);
      if (remaining > 0 && ratePerSec > 0) {
        etaSec = Math.round(remaining / ratePerSec);
      } else {
        etaSec = 0;
      }
    }
  }

  return { total, success, failed, processed, remaining, percent, elapsedSec, etaSec, ratePerMin };
});

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds} 秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m} 分 ${s} 秒` : `${m} 分`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} 时 ${mm} 分` : `${h} 时`;
}

async function loadReviews() {
  if (!taskId.value) return;
  loading.value = true;
  try {
    const pageSize = viewMode.value === "grouped" ? 500 : pagination.pageSize || 10;
    const page = viewMode.value === "grouped" ? 1 : pagination.current || 1;
    const result = await fetchReviews(taskId.value, {
      page,
      pageSize,
      ratingStar: filters.ratingStar,
      sentiment: filters.sentiment,
      hasMedia: filters.hasMedia,
      keyword: filters.keyword || undefined,
      needsAttention: filters.needsAttention || undefined,
      sortBy: sortState.sortBy,
      sortOrder: sortState.sortOrder
    });
    rows.value = result.items;
    pagination.total = result.total;
    if (viewMode.value === "grouped") pagination.current = 1;
  } finally {
    loading.value = false;
  }
}

function handleExport() {
  if (!taskId.value) return;
  exporting.value = true;
  const url = buildExportUrl(taskId.value, {
    ratingStar: filters.ratingStar,
    sentiment: filters.sentiment,
    hasMedia: filters.hasMedia,
    keyword: filters.keyword || undefined,
    needsAttention: filters.needsAttention || undefined
  });
  const a = document.createElement("a");
  a.href = url;
  a.click();
  setTimeout(() => {
    exporting.value = false;
  }, 1500);
}

async function runAnalysis() {
  if (!taskId.value) return;
  running.value = true;
  try {
    await createRun(taskId.value);
    message.success("分析任务已提交，系统会自动轮询状态。");
    await loadRuns();
  } catch (err: unknown) {
    running.value = false;
    const resp = (err as { response?: { status?: number; data?: { message?: string; code?: string } } })?.response;
    const code = resp?.data?.code;
    const msg = resp?.data?.message;
    if (code === "ai_config_missing") {
      Modal.confirm({
        title: "AI 模型尚未配置",
        content: h("div", null, [
          h("p", null, msg || "请先在「AI 设置」中配置模型 API Key 与模型名称。"),
          h("p", { style: "color:#8c8c8c;font-size:12px;margin-top:8px" }, "配置完成后回到此页面再次点击「发起分析」即可。")
        ]),
        okText: "去 AI 设置",
        cancelText: "稍后再说",
        onOk: () => router.push("/settings")
      });
    } else {
      message.error(msg || "发起分析失败。");
    }
  }
}

function resetFilters() {
  filters.ratingStar = undefined;
  filters.sentiment = undefined;
  filters.hasMedia = undefined;
  filters.keyword = "";
  filters.needsAttention = false;
  sortState.sortBy = "commentTime";
  sortState.sortOrder = "desc";
  pagination.current = 1;
  clearActiveView();
  loadReviews();
}

function handleTableChange(next: PaginationConfig, _: unknown, sorter: SorterConfig | SorterConfig[]) {
  pagination.current = next.current || 1;
  pagination.pageSize = next.pageSize || 10;
  const s = Array.isArray(sorter) ? sorter[0] : sorter;
  if (s?.field) {
    sortState.sortBy = s.field === "sentiment" ? "sentimentScore" : String(s.field);
    sortState.sortOrder = s.order === "ascend" ? "asc" : "desc";
  }
  clearActiveView();
  loadReviews();
}

watch(
  taskId,
  async (id) => {
    pagination.current = 1;
    if (id) loadSavedViews(id);
    await loadRuns();
    await loadReviews();
  },
  { immediate: true }
);

watch(viewMode, async () => {
  pagination.current = 1;
  if (!applyingSavedView.value) clearActiveView();
  await loadReviews();
});

watch([groupBy, visibleColumnKeys], () => {
  if (!applyingSavedView.value) clearActiveView();
});

watch(
  [
    () => filters.ratingStar,
    () => filters.sentiment,
    () => filters.hasMedia,
    () => filters.keyword,
    () => filters.needsAttention
  ],
  () => {
    if (!applyingSavedView.value) clearActiveView();
  }
);

onBeforeUnmount(stopPolling);
</script>

<style scoped>
.analysis-progress-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.analysis-progress-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 13px;
  color: #516079;
  font-weight: 500;
}

.analysis-progress-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #7b8494;
}
.analysis-progress-meta .meta-success { color: #389e0d; font-weight: 600; }
.analysis-progress-meta .meta-failed { color: #cf1322; font-weight: 600; }
.analysis-progress-meta .meta-remaining { color: #1d39c4; font-weight: 600; }
.analysis-progress-meta .meta-rate,
.analysis-progress-meta .meta-time { color: #7b8494; }

.analysis-progress-error {
  font-size: 12px;
  color: #cf1322;
  background: rgba(255, 241, 240, 0.7);
  border: 1px solid rgba(255, 204, 199, 0.7);
  border-radius: 6px;
  padding: 4px 8px;
  cursor: help;
}

.analysis-status-block {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.view-pill-del {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  font-size: 10px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.2s;
}
.view-pill-del:hover {
  color: #f5222d;
}
.group-more {
  text-align: center;
  padding: 4px 0 2px;
  border-top: 1px solid rgba(229, 234, 244, 0.6);
  margin-top: 4px;
}

/* ─── Table cell ellipsis & compact rows ─── */
.review-page :deep(.ant-table-cell) {
  white-space: nowrap;
  vertical-align: middle;
}

.review-page :deep(.ant-table-tbody > tr > td) {
  padding-top: 10px;
  padding-bottom: 10px;
  max-height: 56px;
}

.review-page :deep(.ant-table-thead > tr > th) {
  padding-top: 12px;
  padding-bottom: 12px;
  font-weight: 600;
}

/* Tag groups inside a single cell — keep them on ONE line */
.cell-tags {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
  max-width: 100%;
  vertical-align: middle;
}

.cell-tag-item,
.cell-tag-more {
  margin: 0 !important;
  flex-shrink: 0;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-tag-more {
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  border-color: rgba(99, 102, 241, 0.25);
}

/* Comment cell: single-line ellipsis link */
.cell-comment-link {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #4f46e5;
  cursor: pointer;
  vertical-align: middle;
}

.cell-comment-link:hover {
  color: #6366f1;
  text-decoration: underline;
}

.cell-empty {
  color: #cbd5e1;
}
</style>

<!-- Unscoped: ant-tooltip is teleported to body, scoped CSS can't reach it -->
<style>
.cell-tooltip-wide {
  max-width: 480px !important;
}
.cell-tooltip-wide .ant-tooltip-inner {
  max-width: 480px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 13px;
}
</style>

