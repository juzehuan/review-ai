import { computed, h, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BarChartOutlined, PlusOutlined, TableOutlined } from "@ant-design/icons-vue";
import TaskImportModal from "@/components/TaskImportModal.vue";
import { useTaskStore } from "@/composables";
const router = useRouter();
const route = useRoute();
const showImport = ref(false);
const { tasks, selectedTask, selectedTaskId, loadingTasks, refreshTasks, setSelectedTask } = useTaskStore();
const menuItems = [
    {
        key: "/dashboard",
        icon: () => h(BarChartOutlined),
        label: "在线评论看板"
    },
    {
        key: "/reviews",
        icon: () => h(TableOutlined),
        label: "用户评论（AI分析）"
    }
];
const currentTitle = computed(() => (route.path === "/reviews" ? "用户评论（AI分析）" : "在线评论看板"));
function onMenuClick({ key }) {
    router.push(key);
}
async function handleImportSuccess(taskId) {
    await refreshTasks();
    setSelectedTask(taskId);
    router.push("/dashboard");
}
onMounted(refreshTasks);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.ALayout;
/** @type {[typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "app-shell" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "app-shell" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "shell-glow shell-glow-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "shell-glow shell-glow-right" },
});
const __VLS_4 = {}.ALayoutSider;
/** @type {[typeof __VLS_components.ALayoutSider, typeof __VLS_components.aLayoutSider, typeof __VLS_components.ALayoutSider, typeof __VLS_components.aLayoutSider, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    theme: "light",
    width: "272",
    ...{ class: "app-sider" },
}));
const __VLS_6 = __VLS_5({
    theme: "light",
    width: "272",
    ...{ class: "app-sider" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-mark" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sider-caption" },
});
const __VLS_8 = {}.AMenu;
/** @type {[typeof __VLS_components.AMenu, typeof __VLS_components.aMenu, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    selectedKeys: ([__VLS_ctx.route.path]),
    mode: "inline",
    items: (__VLS_ctx.menuItems),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    selectedKeys: ([__VLS_ctx.route.path]),
    mode: "inline",
    items: (__VLS_ctx.menuItems),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.onMenuClick)
};
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sider-task-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sider-caption" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "task-highlight" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "task-highlight-name" },
});
(__VLS_ctx.selectedTask?.name || "未选择任务");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "task-highlight-meta" },
});
(__VLS_ctx.selectedTask?.productName || "导入 CSV 后开始分析");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sider-footer" },
});
const __VLS_16 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    block: true,
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    block: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showImport = true;
    }
};
__VLS_19.slots.default;
{
    const { icon: __VLS_thisSlot } = __VLS_19.slots;
    const __VLS_24 = {}.PlusOutlined;
    /** @type {[typeof __VLS_components.PlusOutlined, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
    const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
}
var __VLS_19;
var __VLS_7;
const __VLS_28 = {}.ALayout;
/** @type {[typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    ...{ class: "app-main" },
}));
const __VLS_30 = __VLS_29({
    ...{ class: "app-main" },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
const __VLS_32 = {}.ALayoutHeader;
/** @type {[typeof __VLS_components.ALayoutHeader, typeof __VLS_components.aLayoutHeader, typeof __VLS_components.ALayoutHeader, typeof __VLS_components.aLayoutHeader, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    ...{ class: "app-header" },
}));
const __VLS_34 = __VLS_33({
    ...{ class: "app-header" },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-breadcrumb" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-title-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-title" },
});
(__VLS_ctx.currentTitle);
const __VLS_36 = {}.ATag;
/** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    color: "processing",
}));
const __VLS_38 = __VLS_37({
    color: "processing",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
(__VLS_ctx.selectedTask?.latestRunStatus || "draft");
var __VLS_39;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.selectedTask?.name || "未选择");
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.selectedTask?.productName || "-");
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.selectedTask?.sourceChannel || "-");
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.selectedTask?.latestRunFinishedAt || "-");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-actions" },
});
const __VLS_40 = {}.ASelect;
/** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onChange': {} },
    value: (__VLS_ctx.selectedTaskId || undefined),
    placeholder: "切换任务",
    ...{ style: {} },
    loading: (__VLS_ctx.loadingTasks),
}));
const __VLS_42 = __VLS_41({
    ...{ 'onChange': {} },
    value: (__VLS_ctx.selectedTaskId || undefined),
    placeholder: "切换任务",
    ...{ style: {} },
    loading: (__VLS_ctx.loadingTasks),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_44;
let __VLS_45;
let __VLS_46;
const __VLS_47 = {
    onChange: (__VLS_ctx.setSelectedTask)
};
__VLS_43.slots.default;
for (const [task] of __VLS_getVForSourceType((__VLS_ctx.tasks))) {
    const __VLS_48 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        key: (task.id),
        value: (task.id),
    }));
    const __VLS_50 = __VLS_49({
        key: (task.id),
        value: (task.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    (task.name);
    var __VLS_51;
}
var __VLS_43;
var __VLS_35;
const __VLS_52 = {}.ALayoutContent;
/** @type {[typeof __VLS_components.ALayoutContent, typeof __VLS_components.aLayoutContent, typeof __VLS_components.ALayoutContent, typeof __VLS_components.aLayoutContent, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    ...{ class: "app-content" },
}));
const __VLS_54 = __VLS_53({
    ...{ class: "app-content" },
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_55;
var __VLS_31;
var __VLS_3;
/** @type {[typeof TaskImportModal, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(TaskImportModal, new TaskImportModal({
    ...{ 'onClose': {} },
    ...{ 'onSuccess': {} },
    open: (__VLS_ctx.showImport),
}));
const __VLS_61 = __VLS_60({
    ...{ 'onClose': {} },
    ...{ 'onSuccess': {} },
    open: (__VLS_ctx.showImport),
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
let __VLS_63;
let __VLS_64;
let __VLS_65;
const __VLS_66 = {
    onClose: (...[$event]) => {
        __VLS_ctx.showImport = false;
    }
};
const __VLS_67 = {
    onSuccess: (__VLS_ctx.handleImportSuccess)
};
var __VLS_62;
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-glow']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-glow-left']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-glow']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-glow-right']} */ ;
/** @type {__VLS_StyleScopedClasses['app-sider']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-block']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['sider-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['sider-task-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sider-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['task-highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['task-highlight-name']} */ ;
/** @type {__VLS_StyleScopedClasses['task-highlight-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['sider-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['header-breadcrumb']} */ ;
/** @type {__VLS_StyleScopedClasses['header-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['header-title']} */ ;
/** @type {__VLS_StyleScopedClasses['header-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['app-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            PlusOutlined: PlusOutlined,
            TaskImportModal: TaskImportModal,
            route: route,
            showImport: showImport,
            tasks: tasks,
            selectedTask: selectedTask,
            selectedTaskId: selectedTaskId,
            loadingTasks: loadingTasks,
            setSelectedTask: setSelectedTask,
            menuItems: menuItems,
            currentTitle: currentTitle,
            onMenuClick: onMenuClick,
            handleImportSuccess: handleImportSuccess,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
