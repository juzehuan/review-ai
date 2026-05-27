import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";
import "echarts-wordcloud";
const props = defineProps();
const container = ref(null);
const hovering = ref(false);
let chart = null;
function render() {
    if (!container.value) {
        return;
    }
    if (!chart) {
        chart = echarts.init(container.value);
    }
    chart.setOption(props.option, true);
    chart.resize();
}
onMounted(render);
watch(() => props.option, render, { deep: true });
window.addEventListener("resize", render);
onBeforeUnmount(() => {
    window.removeEventListener("resize", render);
    chart?.dispose();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMouseenter: (...[$event]) => {
            __VLS_ctx.hovering = true;
        } },
    ...{ onMouseleave: (...[$event]) => {
            __VLS_ctx.hovering = false;
        } },
    ...{ class: "chart-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-title" },
});
(__VLS_ctx.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "chart-accent" },
    ...{ style: ({ opacity: __VLS_ctx.hovering ? 1 : 0.6 }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ref: "container",
    ...{ class: "chart-container" },
    ...{ style: ({ height: __VLS_ctx.height || '320px' }) },
});
/** @type {typeof __VLS_ctx.container} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-container']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            container: container,
            hovering: hovering,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
