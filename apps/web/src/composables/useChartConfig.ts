// 统一配色系统
export const CHART_COLORS = {
  positive: ["#34d399", "#059669"],
  neutral: ["#fbbf24", "#d97706"],
  negative: ["#f87171", "#dc2626"],
  primary: ["#6a82fb", "#4f46e5"],
  accent: ["#ffb15e", "#f97316"],
  cyan: ["#67e8f9", "#0891b2"],
  violet: ["#a78bfa", "#7c3aed"],
  series: [
    "#6a82fb",
    "#ffb15e",
    "#34d399",
    "#f87171",
    "#67e8f9",
    "#a78bfa",
    "#fbbf24",
    "#4ade80"
  ]
};

// 统一Tooltip样式（带十字光标和色块指示）
export const getTooltip = (trigger: "axis" | "item" = "axis"): Record<string, unknown> => ({
  trigger,
  backgroundColor: "rgba(255, 255, 255, 0.98)",
  borderColor: "rgba(229, 234, 244, 0.9)",
  borderWidth: 1,
  textStyle: {
    color: "#243042",
    fontSize: 13,
    fontWeight: 500
  },
  padding: [12, 16],
  extraCssText:
    "border-radius: 12px; box-shadow: 0 12px 34px rgba(26, 38, 64, 0.14); backdrop-filter: blur(12px)",
  axisPointer: trigger === "axis"
    ? {
        type: "shadow",
        shadowStyle: {
          color: "rgba(106, 130, 251, 0.06)"
        }
      }
    : undefined
});

// 统一Legend样式
export const getLegend = (
  options?: Record<string, unknown>
): Record<string, unknown> => ({
  textStyle: {
    color: "#6d7788",
    fontSize: 12,
    fontWeight: 500
  },
  top: 4,
  itemGap: 16,
  itemWidth: 10,
  itemHeight: 10,
  icon: "roundRect",
  ...options
});

// 统一X轴样式
export const getXAxis = (
  options?: Record<string, unknown>
): Record<string, unknown> => ({
  type: "category",
  axisLine: {
    lineStyle: {
      color: "#e5eaf4"
    }
  },
  axisTick: {
    show: false
  },
  axisLabel: {
    color: "#7b8494",
    fontSize: 12,
    fontWeight: 500,
    interval: 0,
    margin: 12
  },
  ...options
});

// 统一Y轴样式
export const getYAxis = (
  options?: Record<string, unknown>
): Record<string, unknown> => ({
  type: "value",
  axisLine: {
    show: false
  },
  axisTick: {
    show: false
  },
  axisLabel: {
    color: "#8a93a2",
    fontSize: 12,
    fontWeight: 500
  },
  splitLine: {
    lineStyle: {
      color: "#f0f3f9",
      type: "dashed"
    }
  },
  ...options
});

// 统一Grid样式
export const getGrid = (
  options?: Record<string, unknown>
): Record<string, unknown> => ({
  left: 12,
  right: 16,
  top: 36,
  bottom: 28,
  containLabel: true,
  ...options
});

// 柱状图渐变色
export const getBarGradient = (
  color: string = CHART_COLORS.primary[0],
  colorEnd: string = CHART_COLORS.primary[1]
): Record<string, unknown> => ({
  type: "linear",
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color },
    { offset: 1, color: colorEnd }
  ]
});

// 饼图扇区配置
export const getPieItem = (radius: [string, string] = ["48%", "72%"]) => ({
  type: "pie" as const,
  radius,
  center: ["50%", "52%"],
  itemStyle: {
    borderRadius: 12,
    borderColor: "#fff",
    borderWidth: 3
  },
  label: {
    show: true,
    formatter: "{b} {d}%",
    color: "#516079",
    fontSize: 13,
    fontWeight: 600
  },
  labelLine: {
    show: true,
    length: 14,
    length2: 8,
    smooth: true,
    lineStyle: {
      color: "#cbd5e1",
      width: 1
    }
  },
  emphasis: {
    scale: true,
    scaleSize: 6,
    itemStyle: {
      shadowBlur: 24,
      shadowOffsetX: 0,
      shadowColor: "rgba(0, 0, 0, 0.18)"
    },
    label: {
      fontSize: 14,
      fontWeight: 700,
      color: "#243042"
    }
  },
  animationType: "scale" as const,
  animationEasing: "elasticOut" as const,
  animationDuration: 800
});

// 情感分析配色
export const getSentimentColors = () => ({
  positive: CHART_COLORS.positive[0],
  neutral: CHART_COLORS.neutral[0],
  negative: CHART_COLORS.negative[0]
});

// 词云配色
export const getWordCloudColors = () => [
  "#6a82fb",
  "#ffb15e",
  "#34d399",
  "#67e8f9",
  "#a78bfa",
  "#f87171",
  "#fbbf24",
  "#4ade80"
];

// 统一柱状图基础样式（emphasis + 动画）
export const getBarBase = () => ({
  emphasis: {
    focus: "series" as const,
    itemStyle: {
      shadowBlur: 14,
      shadowColor: "rgba(106, 130, 251, 0.3)"
    }
  },
  animationDuration: 700,
  animationEasing: "cubicOut" as const
});
