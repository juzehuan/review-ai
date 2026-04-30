import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";
import EChartCard from "@/components/EChartCard.vue";
import { fetchDashboard } from "@/api";
import { useTaskStore } from "@/composables";
import { CHART_COLORS, getTooltip, getLegend, getXAxis, getYAxis, getGrid, getBarGradient, getPieItem, getSentimentColors, getWordCloudColors } from "@/composables/useChartConfig";
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
    let progressColor;
    if (npsValue >= 30) {
        progressColor = CHART_COLORS.positive[0];
    }
    else if (npsValue >= 0) {
        progressColor = CHART_COLORS.neutral[0];
    }
    else {
        progressColor = CHART_COLORS.negative[0];
    }
    gaugeChart.setOption({
        series: [
            {
                type: "gauge",
                min: -100,
                max: 100,
                splitNumber: 5,
                progress: {
                    show: true,
                    width: 22,
                    roundCap: true,
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0,
                            y: 0,
                            x2: 1,
                            y2: 0,
                            colorStops: [
                                { offset: 0, color: CHART_COLORS.negative[0] },
                                { offset: 0.5, color: CHART_COLORS.neutral[0] },
                                { offset: 1, color: CHART_COLORS.positive[0] }
                            ]
                        }
                    }
                },
                axisLine: {
                    lineStyle: {
                        width: 22,
                        color: [[1, "rgba(229, 234, 244, 0.8)"]],
                        roundCap: true
                    }
                },
                axisTick: { show: false },
                splitLine: {
                    length: 14,
                    distance: -28,
                    lineStyle: {
                        color: "#cbd5e1",
                        width: 2
                    }
                },
                axisLabel: {
                    distance: 18,
                    color: "#7b8494",
                    fontSize: 12,
                    fontWeight: 600
                },
                pointer: {
                    width: 6,
                    length: "60%",
                    offsetCenter: [0, -8],
                    itemStyle: {
                        color: progressColor
                    }
                },
                anchor: {
                    show: true,
                    showAbove: true,
                    size: 14,
                    itemStyle: {
                        borderWidth: 4,
                        borderColor: "#fff",
                        color: progressColor,
                        shadowBlur: 12,
                        shadowColor: "rgba(106, 130, 251, 0.3)"
                    }
                },
                detail: {
                    fontSize: 42,
                    fontWeight: 800,
                    offsetCenter: [0, "36%"],
                    formatter: ({ value }) => `${value}`,
                    color: "#243042"
                },
                title: {
                    offsetCenter: [0, "8%"],
                    color: "#7b8494",
                    fontSize: 14,
                    fontWeight: 600
                },
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
            barWidth: 40,
            itemStyle: {
                borderRadius: [6, 6, 0, 0],
                color: getBarGradient(CHART_COLORS.positive[0], CHART_COLORS.positive[1])
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 12,
                    shadowColor: "rgba(52, 211, 153, 0.35)"
                }
            },
            data: (dashboard.value?.ratingSentiment || []).map((item) => item.positive)
        },
        {
            name: "中性",
            type: "bar",
            stack: "sentiment",
            barWidth: 40,
            itemStyle: {
                borderRadius: [6, 6, 0, 0],
                color: getBarGradient(CHART_COLORS.neutral[0], CHART_COLORS.neutral[1])
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 12,
                    shadowColor: "rgba(251, 191, 36, 0.35)"
                }
            },
            data: (dashboard.value?.ratingSentiment || []).map((item) => item.neutral)
        },
        {
            name: "负向",
            type: "bar",
            stack: "sentiment",
            barWidth: 40,
            itemStyle: {
                borderRadius: [6, 6, 0, 0],
                color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.negative[1])
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 12,
                    shadowColor: "rgba(248, 113, 113, 0.35)"
                }
            },
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
        data: (dashboard.value?.sourceDistribution || []).map((item) => item.source),
        axisLabel: {
            color: "#7b8494",
            fontSize: 12,
            fontWeight: 500,
            interval: 0
        }
    }),
    yAxis: getYAxis(),
    grid: getGrid(),
    series: [
        {
            type: "bar",
            barWidth: 44,
            itemStyle: {
                borderRadius: [8, 8, 0, 0],
                color: getBarGradient(CHART_COLORS.primary[0], CHART_COLORS.accent[0])
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 16,
                    shadowColor: "rgba(106, 130, 251, 0.35)"
                }
            },
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
            sizeRange: [16, 76],
            rotationRange: [-20, 20],
            gridSize: 12,
            textStyle: {
                fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
                fontWeight: 700,
                color: (value) => {
                    const colors = getWordCloudColors();
                    return colors[Math.floor(Math.random() * colors.length)];
                }
            },
            emphasis: {
                focus: "self",
                textStyle: {
                    fontWeight: 800,
                    shadowBlur: 8,
                    shadowColor: "rgba(0, 0, 0, 0.2)"
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
        axisLabel: {
            interval: 0,
            rotate: 18,
            color: "#7b8494",
            fontSize: 12,
            fontWeight: 500
        }
    }),
    yAxis: getYAxis(),
    grid: getGrid(),
    series: [
        {
            type: "bar",
            barWidth: 38,
            itemStyle: {
                borderRadius: [8, 8, 0, 0],
                color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.accent[0])
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 16,
                    shadowColor: "rgba(248, 113, 113, 0.35)"
                }
            },
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
/** @type {__VLS_StyleScopedClasses['spotlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-table']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-table']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-table']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-layout']} */ ;
// CSS variable injection 
// CSS variable injection end 
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
        ...{ class: "dashboard-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar dashboard-toolbar" },
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
    const __VLS_8 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (__VLS_ctx.load)
    };
    __VLS_11.slots.default;
    var __VLS_11;
    const __VLS_16 = {}.ATag;
    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        color: (__VLS_ctx.dashboard?.runId ? 'green' : 'default'),
    }));
    const __VLS_18 = __VLS_17({
        color: (__VLS_ctx.dashboard?.runId ? 'green' : 'default'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (__VLS_ctx.dashboard?.runId ? "已有分析结果" : "尚未分析");
    var __VLS_19;
    var __VLS_7;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-card spotlight-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "chart-accent" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "nps-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "gaugeRef",
        ...{ class: "chart-container" },
        ...{ style: {} },
    });
    /** @type {typeof __VLS_ctx.gaugeRef} */ ;
    const __VLS_20 = {}.ATable;
    /** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        ...{ class: "nps-table" },
        size: "small",
        pagination: (false),
        columns: (__VLS_ctx.npsColumns),
        dataSource: (__VLS_ctx.dashboard?.npsBreakdown || []),
        rowKey: "label",
    }));
    const __VLS_22 = __VLS_21({
        ...{ class: "nps-table" },
        size: "small",
        pagination: (false),
        columns: (__VLS_ctx.npsColumns),
        dataSource: (__VLS_ctx.dashboard?.npsBreakdown || []),
        rowKey: "label",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
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
        ...{ class: "stat-card stat-card-accent" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.dashboard?.negativeCount || 0);
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "各级分类情感倾向",
        option: (__VLS_ctx.ratingSentimentOption),
    }));
    const __VLS_25 = __VLS_24({
        title: "各级分类情感倾向",
        option: (__VLS_ctx.ratingSentimentOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-row" },
    });
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "整体情感倾向",
        option: (__VLS_ctx.sentimentOption),
    }));
    const __VLS_28 = __VLS_27({
        title: "整体情感倾向",
        option: (__VLS_ctx.sentimentOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "评论来源分布",
        option: (__VLS_ctx.sourceOption),
    }));
    const __VLS_31 = __VLS_30({
        title: "评论来源分布",
        option: (__VLS_ctx.sourceOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-row" },
    });
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "用户声音",
        option: (__VLS_ctx.wordCloudOption),
    }));
    const __VLS_34 = __VLS_33({
        title: "用户声音",
        option: (__VLS_ctx.wordCloudOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    /** @type {[typeof EChartCard, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(EChartCard, new EChartCard({
        title: "用户问题统计",
        option: (__VLS_ctx.issueOption),
    }));
    const __VLS_37 = __VLS_36({
        title: "用户问题统计",
        option: (__VLS_ctx.issueOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
}
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-container']} */ ;
/** @type {__VLS_StyleScopedClasses['nps-table']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-row']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            EChartCard: EChartCard,
            selectedTask: selectedTask,
            dashboard: dashboard,
            loading: loading,
            gaugeRef: gaugeRef,
            npsColumns: npsColumns,
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
