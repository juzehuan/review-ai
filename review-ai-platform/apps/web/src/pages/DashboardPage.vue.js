import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";
import { CheckCircleOutlined, CloudUploadOutlined, DatabaseOutlined, ReloadOutlined, RobotOutlined } from "@ant-design/icons-vue";
import EChartCard from "@/components/EChartCard.vue";
import { fetchDashboard } from "@/api";
import { useTaskStore } from "@/composables";
import { CHART_COLORS, getBarGradient, getGrid, getLegend, getPieItem, getSentimentColors, getTooltip, getWordCloudColors, getXAxis, getYAxis } from "@/composables/useChartConfig";
const { selectedTask } = useTaskStore();
const dashboard = ref(null);
const loading = ref(false);
const gaugeRef = ref(null);
let timer = null;
let gaugeChart = null;
const npsColumns = [
    { title: "分类", dataIndex: "label", key: "label" },
    { title: "占比", dataIndex: "percent", key: "percent", customRender: ({ text }) => `${text}%` },
    { title: "数量", dataIndex: "count", key: "count" }
];
const pipelineSteps = computed(() => [
    { label: "导入", icon: DatabaseOutlined, active: Boolean(selectedTask.value) },
    { label: "AI 分析", icon: RobotOutlined, active: Boolean(dashboard.value?.runId) },
    { label: "洞察", icon: CheckCircleOutlined, active: Boolean(dashboard.value?.reviewCount) }
]);
const issueCount = computed(() => dashboard.value?.issues?.length || 0);
const positivePercent = computed(() => {
    const positive = dashboard.value?.sentimentDistribution?.find((item) => item.sentiment === "positive");
    return positive?.percent || 0;
});
function sentimentText(sentiment) {
    if (sentiment === "positive") {
        return "正向";
    }
    if (sentiment === "negative") {
        return "负向";
    }
    return "中性";
}
function renderGauge() {
    if (!gaugeRef.value) {
        return;
    }
    if (!gaugeChart) {
        gaugeChart = echarts.init(gaugeRef.value);
    }
    const npsValue = dashboard.value?.nps || 0;
    let progressColor = CHART_COLORS.neutral[0];
    if (npsValue >= 30) {
        progressColor = CHART_COLORS.positive[0];
    }
    if (npsValue < 0) {
        progressColor = CHART_COLORS.negative[0];
    }
    gaugeChart.setOption({
        series: [
            {
                type: "gauge",
                min: -100,
                max: 100,
                progress: {
                    show: true,
                    width: 18,
                    roundCap: true,
                    itemStyle: { color: progressColor }
                },
                axisLine: {
                    roundCap: true,
                    lineStyle: {
                        width: 18,
                        color: [[1, "#e5e7eb"]]
                    }
                },
                axisTick: { show: false },
                splitLine: { length: 10, distance: -22, lineStyle: { color: "#cbd5e1", width: 2 } },
                axisLabel: { distance: 14, color: "#6b7280", fontSize: 12 },
                pointer: { width: 5, length: "56%", itemStyle: { color: progressColor } },
                detail: {
                    fontSize: 40,
                    fontWeight: 800,
                    offsetCenter: [0, "36%"],
                    formatter: "{value}",
                    color: "#111827"
                },
                title: { offsetCenter: [0, "8%"], color: "#6b7280", fontSize: 13 },
                data: [{ value: npsValue, name: "NPS 净推荐值" }]
            }
        ]
    }, true);
}
async function load() {
    if (!selectedTask.value) {
        dashboard.value = null;
        return;
    }
    loading.value = true;
    try {
        dashboard.value = await fetchDashboard(selectedTask.value.id);
        renderGauge();
    }
    finally {
        loading.value = false;
    }
}
function startPolling() {
    stopPolling();
    timer = setInterval(load, 10000);
}
function stopPolling() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}
function onResize() {
    gaugeChart?.resize();
}
const sentimentColors = getSentimentColors();
const ratingSentimentOption = computed(() => ({
    tooltip: getTooltip(),
    legend: getLegend({ data: ["正向", "中性", "负向"] }),
    color: [sentimentColors.positive, sentimentColors.neutral, sentimentColors.negative],
    xAxis: getXAxis({
        data: (dashboard.value?.ratingSentiment || []).map((item) => `${item.ratingStar} 星`)
    }),
    yAxis: getYAxis(),
    grid: getGrid(),
    series: [
        {
            name: "正向",
            type: "bar",
            stack: "sentiment",
            barWidth: 38,
            itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.positive[0], CHART_COLORS.positive[1]) },
            data: (dashboard.value?.ratingSentiment || []).map((item) => item.positive)
        },
        {
            name: "中性",
            type: "bar",
            stack: "sentiment",
            barWidth: 38,
            itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.neutral[0], CHART_COLORS.neutral[1]) },
            data: (dashboard.value?.ratingSentiment || []).map((item) => item.neutral)
        },
        {
            name: "负向",
            type: "bar",
            stack: "sentiment",
            barWidth: 38,
            itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.negative[1]) },
            data: (dashboard.value?.ratingSentiment || []).map((item) => item.negative)
        }
    ]
}));
const sentimentOption = computed(() => ({
    tooltip: getTooltip("item"),
    legend: getLegend({ bottom: 6 }),
    color: [sentimentColors.positive, sentimentColors.neutral, sentimentColors.negative],
    series: [
        {
            ...getPieItem(["46%", "74%"]),
            data: (dashboard.value?.sentimentDistribution || []).map((item) => ({
                name: sentimentText(item.sentiment),
                value: item.count
            }))
        }
    ]
}));
const sourceOption = computed(() => ({
    tooltip: getTooltip(),
    xAxis: getXAxis({
        data: (dashboard.value?.sourceDistribution || []).map((item) => item.source)
    }),
    yAxis: getYAxis(),
    grid: getGrid(),
    series: [
        {
            type: "bar",
            barWidth: 42,
            itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.primary[0], CHART_COLORS.accent[0]) },
            data: (dashboard.value?.sourceDistribution || []).map((item) => item.count)
        }
    ]
}));
const wordCloudOption = computed(() => ({
    series: [
        {
            type: "wordCloud",
            shape: "circle",
            width: "100%",
            height: "100%",
            sizeRange: [16, 70],
            rotationRange: [-20, 20],
            gridSize: 12,
            textStyle: {
                fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
                fontWeight: 700,
                color: () => {
                    const colors = getWordCloudColors();
                    return colors[Math.floor(Math.random() * colors.length)];
                }
            },
            data: dashboard.value?.wordCloud || []
        }
    ]
}));
const issueOption = computed(() => ({
    tooltip: getTooltip(),
    xAxis: getXAxis({
        data: (dashboard.value?.issues || []).map((item) => item.issueName),
        axisLabel: { interval: 0, rotate: 18, color: "#6b7280", fontSize: 12 }
    }),
    yAxis: getYAxis(),
    grid: getGrid({ bottom: 70 }),
    series: [
        {
            type: "bar",
            barWidth: 36,
            itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.accent[0]) },
            data: (dashboard.value?.issues || []).map((item) => item.count)
        }
    ]
}));
watch(() => selectedTask.value?.id, async () => {
    await load();
    startPolling();
}, { immediate: true });
onMounted(() => window.addEventListener("resize", onResize));
onBeforeUnmount(() => {
    stopPolling();
    window.removeEventListener("resize", onResize);
    gaugeChart?.dispose();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (!__VLS_ctx.selectedTask) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-state" },
    });
    const __VLS_0 = {}.AEmpty;
    /** @type {[typeof __VLS_components.AEmpty, typeof __VLS_components.aEmpty, typeof __VLS_components.AEmpty, typeof __VLS_components.aEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        description: "先创建分析项目并导入评论 CSV",
    }));
    const __VLS_2 = __VLS_1({
        description: "先创建分析项目并导入评论 CSV",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    {
        const { image: __VLS_thisSlot } = __VLS_3.slots;
        const __VLS_4 = {}.CloudUploadOutlined;
        /** @type {[typeof __VLS_components.CloudUploadOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            ...{ class: "empty-icon" },
        }));
        const __VLS_6 = __VLS_5({
            ...{ class: "empty-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    }
    var __VLS_3;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-toolbar dashboard-toolbar" },
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
    const __VLS_8 = {}.ASpace;
    /** @type {[typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        wrap: true,
    }));
    const __VLS_10 = __VLS_9({
        wrap: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onClick: (__VLS_ctx.load)
    };
    __VLS_15.slots.default;
    {
        const { icon: __VLS_thisSlot } = __VLS_15.slots;
        const __VLS_20 = {}.ReloadOutlined;
        /** @type {[typeof __VLS_components.ReloadOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
        const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    }
    var __VLS_15;
    const __VLS_24 = {}.ATag;
    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        color: (__VLS_ctx.dashboard?.runId ? 'green' : 'default'),
    }));
    const __VLS_26 = __VLS_25({
        color: (__VLS_ctx.dashboard?.runId ? 'green' : 'default'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    (__VLS_ctx.dashboard?.runId ? "已生成分析结果" : "等待首次分析");
    var __VLS_27;
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-band" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.selectedTask.productName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.selectedTask.name);
    (__VLS_ctx.selectedTask.sourceChannel);
    (__VLS_ctx.selectedTask.status);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pipeline-strip" },
    });
    for (const [step] of __VLS_getVForSourceType((__VLS_ctx.pipelineSteps))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (step.label),
            ...{ class: "pipeline-step" },
            ...{ class: ({ active: step.active }) },
        });
        const __VLS_28 = ((step.icon));
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
        const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (step.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card stat-card-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.dashboard?.reviewCount || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-note" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card stat-card-accent" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.dashboard?.negativeCount || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-note" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card stat-card-success" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.dashboard?.nps || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-note" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-row chart-row-featured" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "nps-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "gaugeRef",
        ...{ class: "chart-container nps-chart" },
    });
    /** @type {typeof __VLS_ctx.gaugeRef} */ ;
    const __VLS_32 = {}.ATable;
    /** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ class: "nps-table" },
        size: "small",
        pagination: (false),
        columns: (__VLS_ctx.npsColumns),
        dataSource: (__VLS_ctx.dashboard?.npsBreakdown || []),
        rowKey: "label",
    }));
    const __VLS_34 = __VLS_33({
        ...{ class: "nps-table" },
        size: "small",
        pagination: (false),
        columns: (__VLS_ctx.npsColumns),
        dataSource: (__VLS_ctx.dashboard?.npsBreakdown || []),
        rowKey: "label",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "insight-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "insight-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "insight-list" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "insight-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "insight-dot positive" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.positivePercent);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "insight-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "insight-dot warning" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.issueCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "insight-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "insight-dot neutral" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.dashboard?.wordCloud?.length || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "各星级情感倾向",
        option: (__VLS_ctx.ratingSentimentOption),
    }));
    const __VLS_37 = __VLS_36({
        title: "各星级情感倾向",
        option: (__VLS_ctx.ratingSentimentOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-row" },
    });
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "整体情感分布",
        option: (__VLS_ctx.sentimentOption),
    }));
    const __VLS_40 = __VLS_39({
        title: "整体情感分布",
        option: (__VLS_ctx.sentimentOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "评论来源分布",
        option: (__VLS_ctx.sourceOption),
    }));
    const __VLS_43 = __VLS_42({
        title: "评论来源分布",
        option: (__VLS_ctx.sourceOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-row" },
    });
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "用户声音词云",
        option: (__VLS_ctx.wordCloudOption),
    }));
    const __VLS_46 = __VLS_45({
        title: "用户声音词云",
        option: (__VLS_ctx.wordCloudOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "用户问题统计",
        option: (__VLS_ctx.issueOption),
    }));
    const __VLS_49 = __VLS_48({
        title: "用户问题统计",
        option: (__VLS_ctx.issueOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
}
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['page-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-band']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['pipeline-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['pipeline-step']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-note']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-note']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-success']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-note']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-row']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-row-featured']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-container']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-table']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-title']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-list']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-item']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['positive']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-item']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-item']} */ ;
/** @type {__VLS_StyleScopedClasses['insight-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['neutral']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-row']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CloudUploadOutlined: CloudUploadOutlined,
            ReloadOutlined: ReloadOutlined,
            EChartCard: EChartCard,
            selectedTask: selectedTask,
            dashboard: dashboard,
            loading: loading,
            gaugeRef: gaugeRef,
            npsColumns: npsColumns,
            pipelineSteps: pipelineSteps,
            issueCount: issueCount,
            positivePercent: positivePercent,
            load: load,
            ratingSentimentOption: ratingSentimentOption,
            sentimentOption: sentimentOption,
            sourceOption: sourceOption,
            wordCloudOption: wordCloudOption,
            issueOption: issueOption,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
