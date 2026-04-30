import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import { RobotOutlined, SaveOutlined, SettingOutlined, StarOutlined } from "@ant-design/icons-vue";
import { createRun, fetchReviews, fetchRuns } from "@/api";
import { useTaskStore } from "@/composables";
const DEFAULT_VIEW_ID = "all-comments";
const { selectedTask } = useTaskStore();
const loading = ref(false);
const running = ref(false);
const rows = ref([]);
const latestRun = ref(null);
const selectedRow = ref(null);
const saveViewModalOpen = ref(false);
const pendingViewName = ref("");
const activeViewId = ref("");
const savedViews = ref([]);
const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0
});
const filters = reactive({
    ratingStar: undefined,
    sentiment: undefined,
    hasMedia: undefined,
    keyword: ""
});
const viewMode = ref("table");
const groupBy = ref("sentiment");
const sortState = reactive({
    sortBy: "commentTime",
    sortOrder: "desc"
});
const viewOptions = [
    { label: "表格", value: "table" },
    { label: "分组", value: "grouped" }
];
const allColumns = [
    { title: "编号", dataIndex: "cmtId", key: "cmtId", width: 140 },
    { title: "商品名称", dataIndex: "productName", key: "productName", width: 200 },
    { title: "规格/颜色", dataIndex: "variantName", key: "variantName", width: 120 },
    { title: "用户评价", dataIndex: "comment", key: "comment", width: 360 },
    { title: "评论时间", dataIndex: "commentTime", key: "commentTime", width: 180, sorter: true },
    { title: "评级", dataIndex: "ratingStar", key: "ratingStar", width: 160, sorter: true },
    { title: "反馈渠道", dataIndex: "sourceChannel", key: "sourceChannel", width: 120 },
    { title: "是否有媒体", dataIndex: "hasMedia", key: "hasMedia", width: 120 },
    { title: "反馈 AI 打标", dataIndex: "analysisTags", key: "analysisTags", width: 220 },
    { title: "AI 情感分析", dataIndex: "sentiment", key: "sentiment", width: 120, sorter: true }
];
const columnOptions = allColumns.map((column) => ({ label: column.title, value: column.key }));
const visibleColumnKeys = ref(allColumns.map((column) => column.key));
const totalCount = computed(() => pagination.total || 0);
const mediaCount = computed(() => rows.value.filter((item) => item.hasMedia).length);
const negativeCount = computed(() => rows.value.filter((item) => item.sentiment === "negative").length);
let pollTimer = null;
const applyingSavedView = ref(false);
const visibleColumns = computed(() => allColumns.filter((column) => visibleColumnKeys.value.includes(column.key)));
const groupedRows = computed(() => {
    const groups = new Map();
    for (const row of rows.value) {
        if (groupBy.value === "sentiment") {
            const key = row.sentiment || "unknown";
            const label = sentimentLabel(row.sentiment);
            if (!groups.has(key)) {
                groups.set(key, { key, label, items: [] });
            }
            groups.get(key).items.push(row);
            continue;
        }
        if (groupBy.value === "ratingStar") {
            const key = String(row.ratingStar);
            const label = `${row.ratingStar} 星`;
            if (!groups.has(key)) {
                groups.set(key, { key, label, items: [] });
            }
            groups.get(key).items.push(row);
            continue;
        }
        const tags = row.analysisTags.length ? row.analysisTags : ["未打标"];
        for (const tag of tags) {
            if (!groups.has(tag)) {
                groups.set(tag, { key: tag, label: tag, items: [] });
            }
            groups.get(tag).items.push(row);
        }
    }
    return [...groups.values()].sort((a, b) => b.items.length - a.items.length);
});
function storageKey(taskId) {
    return `review-ai:saved-views:${taskId}`;
}
function buildDefaultView() {
    return {
        id: DEFAULT_VIEW_ID,
        name: "全部评论",
        isDefault: true,
        filters: {
            keyword: ""
        },
        groupBy: "sentiment",
        viewMode: "table",
        sortBy: "commentTime",
        sortOrder: "desc",
        visibleColumnKeys: allColumns.map((column) => column.key)
    };
}
function snapshotCurrentView(name, id) {
    return {
        id: id || `view-${Date.now()}`,
        name,
        isDefault: false,
        filters: {
            ratingStar: filters.ratingStar,
            sentiment: filters.sentiment,
            hasMedia: filters.hasMedia,
            keyword: filters.keyword
        },
        groupBy: groupBy.value,
        viewMode: viewMode.value,
        sortBy: sortState.sortBy,
        sortOrder: sortState.sortOrder,
        visibleColumnKeys: [...visibleColumnKeys.value]
    };
}
function loadSavedViews(taskId) {
    const raw = window.localStorage.getItem(storageKey(taskId));
    if (!raw) {
        const initial = [buildDefaultView()];
        savedViews.value = initial;
        activeViewId.value = DEFAULT_VIEW_ID;
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        savedViews.value = parsed.length ? parsed : [buildDefaultView()];
        const defaultView = savedViews.value.find((item) => item.isDefault) || savedViews.value[0];
        activeViewId.value = defaultView.id;
        applyView(defaultView);
    }
    catch {
        savedViews.value = [buildDefaultView()];
        activeViewId.value = DEFAULT_VIEW_ID;
    }
}
function persistSavedViews() {
    if (!selectedTask.value) {
        return;
    }
    window.localStorage.setItem(storageKey(selectedTask.value.id), JSON.stringify(savedViews.value));
}
function applyView(view) {
    applyingSavedView.value = true;
    filters.ratingStar = view.filters.ratingStar;
    filters.sentiment = view.filters.sentiment;
    filters.hasMedia = view.filters.hasMedia;
    filters.keyword = view.filters.keyword;
    groupBy.value = view.groupBy;
    viewMode.value = view.viewMode;
    sortState.sortBy = view.sortBy;
    sortState.sortOrder = view.sortOrder;
    visibleColumnKeys.value = [...view.visibleColumnKeys];
    queueMicrotask(() => {
        applyingSavedView.value = false;
    });
}
function applySavedView(viewId) {
    const view = savedViews.value.find((item) => item.id === viewId);
    if (!view) {
        return;
    }
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
    savedViews.value = savedViews.value.filter((item) => item.id !== nextView.id);
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
    savedViews.value = savedViews.value.map((view) => ({
        ...view,
        isDefault: view.id === activeViewId.value
    }));
    persistSavedViews();
    message.success("默认视图已更新。");
}
function truncate(value, max) {
    return value.length > max ? `${value.slice(0, max)}...` : value;
}
function sentimentLabel(value) {
    if (value === "positive") {
        return "正向";
    }
    if (value === "negative") {
        return "负向";
    }
    if (value === "neutral") {
        return "中性";
    }
    return "未分析";
}
function sentimentColor(value) {
    if (value === "positive") {
        return "green";
    }
    if (value === "negative") {
        return "red";
    }
    if (value === "neutral") {
        return "gold";
    }
    return "default";
}
function runStatusLabel(status) {
    if (status === "running") {
        return "分析中";
    }
    if (status === "queued") {
        return "排队中";
    }
    if (status === "completed") {
        return "已完成";
    }
    if (status === "partial_failed") {
        return "部分失败";
    }
    if (status === "failed") {
        return "失败";
    }
    return "未知";
}
function runStatusColor(status) {
    if (status === "running" || status === "queued") {
        return "processing";
    }
    if (status === "completed") {
        return "success";
    }
    if (status === "partial_failed") {
        return "warning";
    }
    if (status === "failed") {
        return "error";
    }
    return "default";
}
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}
async function loadRuns() {
    if (!selectedTask.value) {
        latestRun.value = null;
        return;
    }
    const runs = await fetchRuns(selectedTask.value.id);
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
            }, 5000);
        }
    }
    else {
        running.value = false;
        stopPolling();
    }
}
async function loadReviews() {
    if (!selectedTask.value) {
        return;
    }
    loading.value = true;
    try {
        const pageSize = viewMode.value === "grouped" ? 500 : pagination.pageSize || 10;
        const page = viewMode.value === "grouped" ? 1 : pagination.current || 1;
        const result = await fetchReviews(selectedTask.value.id, {
            page,
            pageSize,
            ratingStar: filters.ratingStar,
            sentiment: filters.sentiment,
            hasMedia: filters.hasMedia,
            keyword: filters.keyword || undefined,
            sortBy: sortState.sortBy,
            sortOrder: sortState.sortOrder
        });
        rows.value = result.items;
        pagination.total = result.total;
        if (viewMode.value === "grouped") {
            pagination.current = 1;
        }
    }
    finally {
        loading.value = false;
    }
}
async function runAnalysis() {
    if (!selectedTask.value) {
        return;
    }
    running.value = true;
    try {
        await createRun(selectedTask.value.id);
        message.success("分析任务已提交，系统会自动轮询状态。");
        await loadRuns();
    }
    catch {
        running.value = false;
        message.error("发起分析失败。");
    }
}
function resetFilters() {
    filters.ratingStar = undefined;
    filters.sentiment = undefined;
    filters.hasMedia = undefined;
    filters.keyword = "";
    sortState.sortBy = "commentTime";
    sortState.sortOrder = "desc";
    pagination.current = 1;
    clearActiveView();
    loadReviews();
}
function handleTableChange(next, _, sorter) {
    pagination.current = next.current || 1;
    pagination.pageSize = next.pageSize || 10;
    const targetSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (targetSorter?.field) {
        sortState.sortBy = targetSorter.field === "sentiment" ? "sentimentScore" : String(targetSorter.field);
        sortState.sortOrder = targetSorter.order === "ascend" ? "asc" : "desc";
    }
    clearActiveView();
    loadReviews();
}
watch(() => selectedTask.value?.id, async (taskId) => {
    pagination.current = 1;
    if (taskId) {
        loadSavedViews(taskId);
    }
    await loadRuns();
    await loadReviews();
}, { immediate: true });
watch(viewMode, async () => {
    pagination.current = 1;
    if (!applyingSavedView.value) {
        clearActiveView();
    }
    await loadReviews();
});
watch([groupBy, visibleColumnKeys], () => {
    if (!applyingSavedView.value) {
        clearActiveView();
    }
});
watch([() => filters.ratingStar, () => filters.sentiment, () => filters.hasMedia, () => filters.keyword], () => {
    if (!applyingSavedView.value) {
        clearActiveView();
    }
});
onBeforeUnmount(stopPolling);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (!__VLS_ctx.selectedTask) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-state" },
    });
    const __VLS_0 = {}.AEmpty;
    /** @type {[typeof __VLS_components.AEmpty, typeof __VLS_components.aEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        description: "请先新建任务并导入评论 CSV 文件。",
    }));
    const __VLS_2 = __VLS_1({
        description: "请先新建任务并导入评论 CSV 文件。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "review-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar review-hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-title-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "view-strip" },
    });
    for (const [view] of __VLS_getVForSourceType((__VLS_ctx.savedViews))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.selectedTask))
                        return;
                    __VLS_ctx.applySavedView(view.id);
                } },
            key: (view.id),
            ...{ class: "view-pill" },
            ...{ class: ({ 'view-pill-active': __VLS_ctx.activeViewId === view.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (view.name);
        if (view.isDefault) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "view-pill-badge" },
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.clearActiveView) },
        ...{ class: "view-pill view-pill-ghost" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar review-controls" },
    });
    const __VLS_4 = {}.ASpace;
    /** @type {[typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        wrap: true,
    }));
    const __VLS_6 = __VLS_5({
        wrap: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    const __VLS_8 = {}.ASelect;
    /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        value: (__VLS_ctx.filters.ratingStar),
        allowClear: true,
        placeholder: "星级",
        ...{ style: {} },
    }));
    const __VLS_10 = __VLS_9({
        value: (__VLS_ctx.filters.ratingStar),
        allowClear: true,
        placeholder: "星级",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    for (const [star] of __VLS_getVForSourceType(([1, 2, 3, 4, 5]))) {
        const __VLS_12 = {}.ASelectOption;
        /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            key: (star),
            value: (star),
        }));
        const __VLS_14 = __VLS_13({
            key: (star),
            value: (star),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_15.slots.default;
        (star);
        var __VLS_15;
    }
    var __VLS_11;
    const __VLS_16 = {}.ASelect;
    /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        value: (__VLS_ctx.filters.sentiment),
        allowClear: true,
        placeholder: "情感",
        ...{ style: {} },
    }));
    const __VLS_18 = __VLS_17({
        value: (__VLS_ctx.filters.sentiment),
        allowClear: true,
        placeholder: "情感",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        value: "positive",
    }));
    const __VLS_22 = __VLS_21({
        value: "positive",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    var __VLS_23;
    const __VLS_24 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        value: "neutral",
    }));
    const __VLS_26 = __VLS_25({
        value: "neutral",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    var __VLS_27;
    const __VLS_28 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        value: "negative",
    }));
    const __VLS_30 = __VLS_29({
        value: "negative",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    var __VLS_31;
    var __VLS_19;
    const __VLS_32 = {}.ASelect;
    /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        value: (__VLS_ctx.filters.hasMedia),
        allowClear: true,
        placeholder: "是否有媒体",
        ...{ style: {} },
    }));
    const __VLS_34 = __VLS_33({
        value: (__VLS_ctx.filters.hasMedia),
        allowClear: true,
        placeholder: "是否有媒体",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    const __VLS_36 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        value: (true),
    }));
    const __VLS_38 = __VLS_37({
        value: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    var __VLS_39;
    const __VLS_40 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        value: (false),
    }));
    const __VLS_42 = __VLS_41({
        value: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    var __VLS_43;
    var __VLS_35;
    const __VLS_44 = {}.AInput;
    /** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        value: (__VLS_ctx.filters.keyword),
        placeholder: "关键词或标签",
        ...{ style: {} },
    }));
    const __VLS_46 = __VLS_45({
        value: (__VLS_ctx.filters.keyword),
        placeholder: "关键词或标签",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    const __VLS_48 = {}.ASelect;
    /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        value: (__VLS_ctx.groupBy),
        ...{ style: {} },
    }));
    const __VLS_50 = __VLS_49({
        value: (__VLS_ctx.groupBy),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        value: "sentiment",
    }));
    const __VLS_54 = __VLS_53({
        value: "sentiment",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    var __VLS_55;
    const __VLS_56 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        value: "ratingStar",
    }));
    const __VLS_58 = __VLS_57({
        value: "ratingStar",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    var __VLS_59;
    const __VLS_60 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        value: "analysisTag",
    }));
    const __VLS_62 = __VLS_61({
        value: "analysisTag",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    var __VLS_63;
    var __VLS_51;
    const __VLS_64 = {}.ASegmented;
    /** @type {[typeof __VLS_components.ASegmented, typeof __VLS_components.aSegmented, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        value: (__VLS_ctx.viewMode),
        options: (__VLS_ctx.viewOptions),
    }));
    const __VLS_66 = __VLS_65({
        value: (__VLS_ctx.viewMode),
        options: (__VLS_ctx.viewOptions),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    const __VLS_68 = {}.ADropdown;
    /** @type {[typeof __VLS_components.ADropdown, typeof __VLS_components.aDropdown, typeof __VLS_components.ADropdown, typeof __VLS_components.aDropdown, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
    const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_71.slots.default;
    const __VLS_72 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
    const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    {
        const { icon: __VLS_thisSlot } = __VLS_75.slots;
        const __VLS_76 = {}.SettingOutlined;
        /** @type {[typeof __VLS_components.SettingOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({}));
        const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
    }
    var __VLS_75;
    {
        const { overlay: __VLS_thisSlot } = __VLS_71.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "column-menu" },
        });
        const __VLS_80 = {}.ACheckboxGroup;
        /** @type {[typeof __VLS_components.ACheckboxGroup, typeof __VLS_components.aCheckboxGroup, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            value: (__VLS_ctx.visibleColumnKeys),
            options: (__VLS_ctx.columnOptions),
        }));
        const __VLS_82 = __VLS_81({
            value: (__VLS_ctx.visibleColumnKeys),
            options: (__VLS_ctx.columnOptions),
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    }
    var __VLS_71;
    const __VLS_84 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        ...{ 'onClick': {} },
    }));
    const __VLS_86 = __VLS_85({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    let __VLS_88;
    let __VLS_89;
    let __VLS_90;
    const __VLS_91 = {
        onClick: (__VLS_ctx.loadReviews)
    };
    __VLS_87.slots.default;
    var __VLS_87;
    const __VLS_92 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onClick': {} },
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onClick: (__VLS_ctx.resetFilters)
    };
    __VLS_95.slots.default;
    var __VLS_95;
    const __VLS_100 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (__VLS_ctx.loadRuns)
    };
    __VLS_103.slots.default;
    var __VLS_103;
    const __VLS_108 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onClick: (__VLS_ctx.saveCurrentView)
    };
    __VLS_111.slots.default;
    {
        const { icon: __VLS_thisSlot } = __VLS_111.slots;
        const __VLS_116 = {}.SaveOutlined;
        /** @type {[typeof __VLS_components.SaveOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({}));
        const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
    }
    var __VLS_111;
    const __VLS_120 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        ...{ 'onClick': {} },
        disabled: (!__VLS_ctx.activeViewId),
    }));
    const __VLS_122 = __VLS_121({
        ...{ 'onClick': {} },
        disabled: (!__VLS_ctx.activeViewId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    let __VLS_124;
    let __VLS_125;
    let __VLS_126;
    const __VLS_127 = {
        onClick: (__VLS_ctx.setCurrentAsDefault)
    };
    __VLS_123.slots.default;
    {
        const { icon: __VLS_thisSlot } = __VLS_123.slots;
        const __VLS_128 = {}.StarOutlined;
        /** @type {[typeof __VLS_components.StarOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({}));
        const __VLS_130 = __VLS_129({}, ...__VLS_functionalComponentArgsRest(__VLS_129));
    }
    var __VLS_123;
    const __VLS_132 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.running),
    }));
    const __VLS_134 = __VLS_133({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.running),
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    let __VLS_136;
    let __VLS_137;
    let __VLS_138;
    const __VLS_139 = {
        onClick: (__VLS_ctx.runAnalysis)
    };
    __VLS_135.slots.default;
    {
        const { icon: __VLS_thisSlot } = __VLS_135.slots;
        const __VLS_140 = {}.RobotOutlined;
        /** @type {[typeof __VLS_components.RobotOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({}));
        const __VLS_142 = __VLS_141({}, ...__VLS_functionalComponentArgsRest(__VLS_141));
    }
    var __VLS_135;
    const __VLS_144 = {}.ATag;
    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        color: (__VLS_ctx.runStatusColor(__VLS_ctx.latestRun?.status)),
    }));
    const __VLS_146 = __VLS_145({
        color: (__VLS_ctx.runStatusColor(__VLS_ctx.latestRun?.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    __VLS_147.slots.default;
    (__VLS_ctx.latestRun ? `最新分析：${__VLS_ctx.runStatusLabel(__VLS_ctx.latestRun.status)}` : "尚未分析");
    var __VLS_147;
    var __VLS_7;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "review-stats-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-card mini-stat-warm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-value" },
    });
    (__VLS_ctx.totalCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-card mini-stat-cool" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-value" },
    });
    (__VLS_ctx.rows.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-card mini-stat-ink" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-value" },
    });
    (__VLS_ctx.mediaCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-card mini-stat-alert" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-stat-value" },
    });
    (__VLS_ctx.negativeCount);
    if (__VLS_ctx.viewMode === 'table') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-shell" },
        });
        const __VLS_148 = {}.ATable;
        /** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            ...{ 'onChange': {} },
            columns: (__VLS_ctx.visibleColumns),
            dataSource: (__VLS_ctx.rows),
            loading: (__VLS_ctx.loading),
            pagination: (__VLS_ctx.pagination),
            rowKey: "id",
            scroll: ({ x: 1280 }),
        }));
        const __VLS_150 = __VLS_149({
            ...{ 'onChange': {} },
            columns: (__VLS_ctx.visibleColumns),
            dataSource: (__VLS_ctx.rows),
            loading: (__VLS_ctx.loading),
            pagination: (__VLS_ctx.pagination),
            rowKey: "id",
            scroll: ({ x: 1280 }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        let __VLS_152;
        let __VLS_153;
        let __VLS_154;
        const __VLS_155 = {
            onChange: (__VLS_ctx.handleTableChange)
        };
        __VLS_151.slots.default;
        {
            const { bodyCell: __VLS_thisSlot } = __VLS_151.slots;
            const [{ column, record }] = __VLS_getSlotParams(__VLS_thisSlot);
            if (column.key === 'ratingStar') {
                const __VLS_156 = {}.ARate;
                /** @type {[typeof __VLS_components.ARate, typeof __VLS_components.aRate, ]} */ ;
                // @ts-ignore
                const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
                    value: (record.ratingStar),
                    disabled: true,
                }));
                const __VLS_158 = __VLS_157({
                    value: (record.ratingStar),
                    disabled: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_157));
            }
            else if (column.key === 'analysisTags') {
                const __VLS_160 = {}.ASpace;
                /** @type {[typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, ]} */ ;
                // @ts-ignore
                const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
                    wrap: true,
                }));
                const __VLS_162 = __VLS_161({
                    wrap: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_161));
                __VLS_163.slots.default;
                for (const [tag] of __VLS_getVForSourceType((record.analysisTags))) {
                    const __VLS_164 = {}.ATag;
                    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                    // @ts-ignore
                    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
                        key: (tag),
                    }));
                    const __VLS_166 = __VLS_165({
                        key: (tag),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
                    __VLS_167.slots.default;
                    (tag);
                    var __VLS_167;
                }
                var __VLS_163;
            }
            else if (column.key === 'sentiment') {
                const __VLS_168 = {}.ATag;
                /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                // @ts-ignore
                const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
                    color: (__VLS_ctx.sentimentColor(record.sentiment)),
                }));
                const __VLS_170 = __VLS_169({
                    color: (__VLS_ctx.sentimentColor(record.sentiment)),
                }, ...__VLS_functionalComponentArgsRest(__VLS_169));
                __VLS_171.slots.default;
                (__VLS_ctx.sentimentLabel(record.sentiment));
                var __VLS_171;
            }
            else if (column.key === 'comment') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.selectedTask))
                                return;
                            if (!(__VLS_ctx.viewMode === 'table'))
                                return;
                            if (!!(column.key === 'ratingStar'))
                                return;
                            if (!!(column.key === 'analysisTags'))
                                return;
                            if (!!(column.key === 'sentiment'))
                                return;
                            if (!(column.key === 'comment'))
                                return;
                            __VLS_ctx.selectedRow = record;
                        } },
                    ...{ class: "table-comment-link" },
                });
                (__VLS_ctx.truncate(record.comment, 60));
            }
            else if (column.key === 'hasMedia') {
                const __VLS_172 = {}.ATag;
                /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                // @ts-ignore
                const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
                    color: (record.hasMedia ? 'blue' : 'default'),
                }));
                const __VLS_174 = __VLS_173({
                    color: (record.hasMedia ? 'blue' : 'default'),
                }, ...__VLS_functionalComponentArgsRest(__VLS_173));
                __VLS_175.slots.default;
                (record.hasMedia ? "有" : "无");
                var __VLS_175;
            }
        }
        var __VLS_151;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "group-list" },
        });
        for (const [group] of __VLS_getVForSourceType((__VLS_ctx.groupedRows))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (group.key),
                ...{ class: "group-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "group-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "group-title" },
            });
            (group.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "group-subtitle" },
            });
            (group.items.length);
            const __VLS_176 = {}.ATag;
            /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
            // @ts-ignore
            const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
                color: "blue",
            }));
            const __VLS_178 = __VLS_177({
                color: "blue",
            }, ...__VLS_functionalComponentArgsRest(__VLS_177));
            __VLS_179.slots.default;
            (group.label);
            var __VLS_179;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "group-items" },
            });
            for (const [item] of __VLS_getVForSourceType((group.items.slice(0, 6)))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.selectedTask))
                                return;
                            if (!!(__VLS_ctx.viewMode === 'table'))
                                return;
                            __VLS_ctx.selectedRow = item;
                        } },
                    key: (item.id),
                    ...{ class: "group-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "group-item-top" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (item.commentTime || "-");
                const __VLS_180 = {}.ARate;
                /** @type {[typeof __VLS_components.ARate, typeof __VLS_components.aRate, ]} */ ;
                // @ts-ignore
                const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
                    value: (item.ratingStar),
                    disabled: true,
                }));
                const __VLS_182 = __VLS_181({
                    value: (item.ratingStar),
                    disabled: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_181));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "group-item-summary" },
                });
                (item.summary || __VLS_ctx.truncate(item.comment, 90));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "group-item-tags" },
                });
                const __VLS_184 = {}.ATag;
                /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                // @ts-ignore
                const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
                    color: (__VLS_ctx.sentimentColor(item.sentiment)),
                }));
                const __VLS_186 = __VLS_185({
                    color: (__VLS_ctx.sentimentColor(item.sentiment)),
                }, ...__VLS_functionalComponentArgsRest(__VLS_185));
                __VLS_187.slots.default;
                (__VLS_ctx.sentimentLabel(item.sentiment));
                var __VLS_187;
                for (const [tag] of __VLS_getVForSourceType((item.analysisTags.slice(0, 3)))) {
                    const __VLS_188 = {}.ATag;
                    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                    // @ts-ignore
                    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
                        key: (tag),
                    }));
                    const __VLS_190 = __VLS_189({
                        key: (tag),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
                    __VLS_191.slots.default;
                    (tag);
                    var __VLS_191;
                }
            }
        }
    }
    const __VLS_192 = {}.ADrawer;
    /** @type {[typeof __VLS_components.ADrawer, typeof __VLS_components.aDrawer, typeof __VLS_components.ADrawer, typeof __VLS_components.aDrawer, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        ...{ 'onClose': {} },
        open: (Boolean(__VLS_ctx.selectedRow)),
        width: "680",
        title: "评论详情",
    }));
    const __VLS_194 = __VLS_193({
        ...{ 'onClose': {} },
        open: (Boolean(__VLS_ctx.selectedRow)),
        width: "680",
        title: "评论详情",
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    let __VLS_196;
    let __VLS_197;
    let __VLS_198;
    const __VLS_199 = {
        onClose: (...[$event]) => {
            if (!!(!__VLS_ctx.selectedTask))
                return;
            __VLS_ctx.selectedRow = null;
        }
    };
    __VLS_195.slots.default;
    if (__VLS_ctx.selectedRow) {
        const __VLS_200 = {}.ADescriptions;
        /** @type {[typeof __VLS_components.ADescriptions, typeof __VLS_components.aDescriptions, typeof __VLS_components.ADescriptions, typeof __VLS_components.aDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
            bordered: true,
            column: (1),
            size: "small",
        }));
        const __VLS_202 = __VLS_201({
            bordered: true,
            column: (1),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_201));
        __VLS_203.slots.default;
        const __VLS_204 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
            label: "评论 ID",
        }));
        const __VLS_206 = __VLS_205({
            label: "评论 ID",
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
        __VLS_207.slots.default;
        (__VLS_ctx.selectedRow.cmtId);
        var __VLS_207;
        const __VLS_208 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
            label: "评分",
        }));
        const __VLS_210 = __VLS_209({
            label: "评分",
        }, ...__VLS_functionalComponentArgsRest(__VLS_209));
        __VLS_211.slots.default;
        (__VLS_ctx.selectedRow.ratingStar);
        var __VLS_211;
        const __VLS_212 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            label: "规格",
        }));
        const __VLS_214 = __VLS_213({
            label: "规格",
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        __VLS_215.slots.default;
        (__VLS_ctx.selectedRow.variantName || "-");
        var __VLS_215;
        const __VLS_216 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
            label: "来源",
        }));
        const __VLS_218 = __VLS_217({
            label: "来源",
        }, ...__VLS_functionalComponentArgsRest(__VLS_217));
        __VLS_219.slots.default;
        (__VLS_ctx.selectedRow.sourceChannel);
        var __VLS_219;
        const __VLS_220 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
            label: "评论时间",
        }));
        const __VLS_222 = __VLS_221({
            label: "评论时间",
        }, ...__VLS_functionalComponentArgsRest(__VLS_221));
        __VLS_223.slots.default;
        (__VLS_ctx.selectedRow.commentTime || "-");
        var __VLS_223;
        const __VLS_224 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
            label: "有无媒体",
        }));
        const __VLS_226 = __VLS_225({
            label: "有无媒体",
        }, ...__VLS_functionalComponentArgsRest(__VLS_225));
        __VLS_227.slots.default;
        (__VLS_ctx.selectedRow.hasMedia ? "有" : "无");
        var __VLS_227;
        const __VLS_228 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
            label: "原始评论",
        }));
        const __VLS_230 = __VLS_229({
            label: "原始评论",
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        __VLS_231.slots.default;
        (__VLS_ctx.selectedRow.comment);
        var __VLS_231;
        const __VLS_232 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
            label: "翻译评论",
        }));
        const __VLS_234 = __VLS_233({
            label: "翻译评论",
        }, ...__VLS_functionalComponentArgsRest(__VLS_233));
        __VLS_235.slots.default;
        (__VLS_ctx.selectedRow.commentTr || "-");
        var __VLS_235;
        const __VLS_236 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            label: "AI 摘要",
        }));
        const __VLS_238 = __VLS_237({
            label: "AI 摘要",
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        __VLS_239.slots.default;
        (__VLS_ctx.selectedRow.summary || "-");
        var __VLS_239;
        const __VLS_240 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
            label: "AI 情感",
        }));
        const __VLS_242 = __VLS_241({
            label: "AI 情感",
        }, ...__VLS_functionalComponentArgsRest(__VLS_241));
        __VLS_243.slots.default;
        (__VLS_ctx.sentimentLabel(__VLS_ctx.selectedRow.sentiment));
        var __VLS_243;
        const __VLS_244 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
            label: "AI 标签",
        }));
        const __VLS_246 = __VLS_245({
            label: "AI 标签",
        }, ...__VLS_functionalComponentArgsRest(__VLS_245));
        __VLS_247.slots.default;
        (__VLS_ctx.selectedRow.analysisTags.join("、") || "-");
        var __VLS_247;
        const __VLS_248 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
            label: "关键词",
        }));
        const __VLS_250 = __VLS_249({
            label: "关键词",
        }, ...__VLS_functionalComponentArgsRest(__VLS_249));
        __VLS_251.slots.default;
        (__VLS_ctx.selectedRow.keywords.join("、") || "-");
        var __VLS_251;
        const __VLS_252 = {}.ADescriptionsItem;
        /** @type {[typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, typeof __VLS_components.ADescriptionsItem, typeof __VLS_components.aDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
            label: "问题点",
        }));
        const __VLS_254 = __VLS_253({
            label: "问题点",
        }, ...__VLS_functionalComponentArgsRest(__VLS_253));
        __VLS_255.slots.default;
        (__VLS_ctx.selectedRow.painPoints.join("、") || "-");
        var __VLS_255;
        var __VLS_203;
    }
    var __VLS_195;
    const __VLS_256 = {}.AModal;
    /** @type {[typeof __VLS_components.AModal, typeof __VLS_components.aModal, typeof __VLS_components.AModal, typeof __VLS_components.aModal, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        ...{ 'onOk': {} },
        ...{ 'onCancel': {} },
        open: (__VLS_ctx.saveViewModalOpen),
        title: "保存筛选视图",
        okText: "保存",
        cancelText: "取消",
    }));
    const __VLS_258 = __VLS_257({
        ...{ 'onOk': {} },
        ...{ 'onCancel': {} },
        open: (__VLS_ctx.saveViewModalOpen),
        title: "保存筛选视图",
        okText: "保存",
        cancelText: "取消",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    let __VLS_260;
    let __VLS_261;
    let __VLS_262;
    const __VLS_263 = {
        onOk: (__VLS_ctx.confirmSaveView)
    };
    const __VLS_264 = {
        onCancel: (...[$event]) => {
            if (!!(!__VLS_ctx.selectedTask))
                return;
            __VLS_ctx.saveViewModalOpen = false;
        }
    };
    __VLS_259.slots.default;
    const __VLS_265 = {}.AForm;
    /** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
    // @ts-ignore
    const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
        layout: "vertical",
    }));
    const __VLS_267 = __VLS_266({
        layout: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_266));
    __VLS_268.slots.default;
    const __VLS_269 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
        label: "视图名称",
    }));
    const __VLS_271 = __VLS_270({
        label: "视图名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_270));
    __VLS_272.slots.default;
    const __VLS_273 = {}.AInput;
    /** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
    // @ts-ignore
    const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
        value: (__VLS_ctx.pendingViewName),
        placeholder: "例如：负向问题评论 / 5 星好评 / 带图评论",
    }));
    const __VLS_275 = __VLS_274({
        value: (__VLS_ctx.pendingViewName),
        placeholder: "例如：负向问题评论 / 5 星好评 / 带图评论",
    }, ...__VLS_functionalComponentArgsRest(__VLS_274));
    var __VLS_272;
    var __VLS_268;
    var __VLS_259;
}
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['review-page']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['review-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['view-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['view-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['view-pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['view-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['view-pill-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['review-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['column-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['review-stats-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-warm']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-cool']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-ink']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['table-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['table-comment-link']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list']} */ ;
/** @type {__VLS_StyleScopedClasses['group-card']} */ ;
/** @type {__VLS_StyleScopedClasses['group-header']} */ ;
/** @type {__VLS_StyleScopedClasses['group-title']} */ ;
/** @type {__VLS_StyleScopedClasses['group-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['group-items']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item-top']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item-tags']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RobotOutlined: RobotOutlined,
            SaveOutlined: SaveOutlined,
            SettingOutlined: SettingOutlined,
            StarOutlined: StarOutlined,
            selectedTask: selectedTask,
            loading: loading,
            running: running,
            rows: rows,
            latestRun: latestRun,
            selectedRow: selectedRow,
            saveViewModalOpen: saveViewModalOpen,
            pendingViewName: pendingViewName,
            activeViewId: activeViewId,
            savedViews: savedViews,
            pagination: pagination,
            filters: filters,
            viewMode: viewMode,
            groupBy: groupBy,
            viewOptions: viewOptions,
            columnOptions: columnOptions,
            visibleColumnKeys: visibleColumnKeys,
            totalCount: totalCount,
            mediaCount: mediaCount,
            negativeCount: negativeCount,
            visibleColumns: visibleColumns,
            groupedRows: groupedRows,
            applySavedView: applySavedView,
            clearActiveView: clearActiveView,
            saveCurrentView: saveCurrentView,
            confirmSaveView: confirmSaveView,
            setCurrentAsDefault: setCurrentAsDefault,
            truncate: truncate,
            sentimentLabel: sentimentLabel,
            sentimentColor: sentimentColor,
            runStatusLabel: runStatusLabel,
            runStatusColor: runStatusColor,
            loadRuns: loadRuns,
            loadReviews: loadReviews,
            runAnalysis: runAnalysis,
            resetFilters: resetFilters,
            handleTableChange: handleTableChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
