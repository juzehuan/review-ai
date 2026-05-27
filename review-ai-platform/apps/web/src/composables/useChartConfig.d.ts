export declare const CHART_COLORS: {
    positive: string[];
    neutral: string[];
    negative: string[];
    primary: string[];
    accent: string[];
    cyan: string[];
    violet: string[];
    series: string[];
};
export declare const getTooltip: (trigger?: "axis" | "item") => Record<string, unknown>;
export declare const getLegend: (options?: Record<string, unknown>) => Record<string, unknown>;
export declare const getXAxis: (options?: Record<string, unknown>) => Record<string, unknown>;
export declare const getYAxis: (options?: Record<string, unknown>) => Record<string, unknown>;
export declare const getGrid: (options?: Record<string, unknown>) => Record<string, unknown>;
export declare const getBarGradient: (color?: string, colorEnd?: string) => Record<string, unknown>;
export declare const getPieItem: (radius?: [string, string]) => {
    type: "pie";
    radius: [string, string];
    center: string[];
    itemStyle: {
        borderRadius: number;
        borderColor: string;
        borderWidth: number;
    };
    label: {
        show: boolean;
        formatter: string;
        color: string;
        fontSize: number;
        fontWeight: number;
    };
    labelLine: {
        show: boolean;
        length: number;
        length2: number;
        lineStyle: {
            color: string;
        };
    };
    emphasis: {
        scale: boolean;
        scaleSize: number;
        itemStyle: {
            shadowBlur: number;
            shadowOffsetX: number;
            shadowColor: string;
        };
        label: {
            fontSize: number;
            fontWeight: number;
        };
    };
};
export declare const getSentimentColors: () => {
    positive: string;
    neutral: string;
    negative: string;
};
export declare const getWordCloudColors: () => string[];
