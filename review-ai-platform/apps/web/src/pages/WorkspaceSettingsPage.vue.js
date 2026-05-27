import { computed, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { createWorkspace } from "@/api";
import { useTaskStore } from "@/composables";
const { workspace, workspaces, refreshTasks, switchWorkspace } = useTaskStore();
const modalOpen = ref(false);
const saving = ref(false);
const form = reactive({
    name: "",
    slug: ""
});
const currentRole = computed(() => workspaces.value.find((item) => item.slug === workspace.value?.slug)?.role || null);
const reviewUsagePercent = computed(() => {
    if (!workspace.value?.monthlyReviewLimit) {
        return 0;
    }
    return Math.min(Math.round((workspace.value.currentPeriodReviewCount / workspace.value.monthlyReviewLimit) * 100), 100);
});
const runUsagePercent = computed(() => {
    if (!workspace.value?.monthlyRunLimit) {
        return 0;
    }
    return Math.min(Math.round((workspace.value.currentPeriodRunCount / workspace.value.monthlyRunLimit) * 100), 100);
});
const columns = [
    { title: "空间", key: "name", width: 320 },
    { title: "角色", key: "role", width: 140 },
    { title: "套餐", dataIndex: "planTier", key: "planTier", width: 120 },
    { title: "评论用量", key: "usage", width: 180 },
    { title: "操作", key: "action", width: 120 }
];
function roleLabel(role) {
    if (role === "owner") {
        return "所有者";
    }
    if (role === "admin") {
        return "管理员";
    }
    if (role === "analyst") {
        return "分析师";
    }
    if (role === "viewer") {
        return "只读";
    }
    return "-";
}
async function switchTo(slug) {
    await switchWorkspace(slug);
    message.success("空间已切换");
}
async function submit() {
    if (!form.name.trim()) {
        message.error("请填写空间名称");
        return;
    }
    saving.value = true;
    try {
        const next = await createWorkspace({
            name: form.name.trim(),
            slug: form.slug.trim() || undefined
        });
        await switchWorkspace(next.slug);
        await refreshTasks();
        message.success("空间已创建");
        form.name = "";
        form.slug = "";
        modalOpen.value = false;
    }
    catch {
        message.error("空间创建失败，请稍后重试");
    }
    finally {
        saving.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "review-page" },
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
const __VLS_0 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.modalOpen = true;
    }
};
__VLS_3.slots.default;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-title" },
});
(__VLS_ctx.workspace?.name || "-");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-meta" },
});
(__VLS_ctx.workspace?.slug || "-");
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-title" },
});
(__VLS_ctx.roleLabel(__VLS_ctx.currentRole));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-title" },
});
(__VLS_ctx.workspace?.currentPeriodReviewCount || 0);
(__VLS_ctx.workspace?.monthlyReviewLimit || 0);
const __VLS_8 = {}.AProgress;
/** @type {[typeof __VLS_components.AProgress, typeof __VLS_components.aProgress, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    percent: (__VLS_ctx.reviewUsagePercent),
    size: "small",
}));
const __VLS_10 = __VLS_9({
    percent: (__VLS_ctx.reviewUsagePercent),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-title" },
});
(__VLS_ctx.workspace?.currentPeriodRunCount || 0);
(__VLS_ctx.workspace?.monthlyRunLimit || 0);
const __VLS_12 = {}.AProgress;
/** @type {[typeof __VLS_components.AProgress, typeof __VLS_components.aProgress, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    percent: (__VLS_ctx.runUsagePercent),
    size: "small",
}));
const __VLS_14 = __VLS_13({
    percent: (__VLS_ctx.runUsagePercent),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-shell" },
});
const __VLS_16 = {}.ATable;
/** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.workspaces),
    rowKey: "id",
    pagination: (false),
}));
const __VLS_18 = __VLS_17({
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.workspaces),
    rowKey: "id",
    pagination: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
{
    const { bodyCell: __VLS_thisSlot } = __VLS_19.slots;
    const [{ column, record }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (column.key === 'name') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "member-name" },
        });
        (record.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "member-email" },
        });
        (record.slug);
    }
    else if (column.key === 'role') {
        const __VLS_20 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            color: "blue",
        }));
        const __VLS_22 = __VLS_21({
            color: "blue",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        (__VLS_ctx.roleLabel(record.role));
        var __VLS_23;
    }
    else if (column.key === 'usage') {
        (record.currentPeriodReviewCount);
        (record.monthlyReviewLimit);
    }
    else if (column.key === 'action') {
        const __VLS_24 = {}.AButton;
        /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ 'onClick': {} },
            size: "small",
            disabled: (record.slug === __VLS_ctx.workspace?.slug),
        }));
        const __VLS_26 = __VLS_25({
            ...{ 'onClick': {} },
            size: "small",
            disabled: (record.slug === __VLS_ctx.workspace?.slug),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        let __VLS_28;
        let __VLS_29;
        let __VLS_30;
        const __VLS_31 = {
            onClick: (...[$event]) => {
                if (!!(column.key === 'name'))
                    return;
                if (!!(column.key === 'role'))
                    return;
                if (!!(column.key === 'usage'))
                    return;
                if (!(column.key === 'action'))
                    return;
                __VLS_ctx.switchTo(record.slug);
            }
        };
        __VLS_27.slots.default;
        var __VLS_27;
    }
}
var __VLS_19;
const __VLS_32 = {}.AModal;
/** @type {[typeof __VLS_components.AModal, typeof __VLS_components.aModal, typeof __VLS_components.AModal, typeof __VLS_components.aModal, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    ...{ 'onOk': {} },
    ...{ 'onCancel': {} },
    open: (__VLS_ctx.modalOpen),
    title: "新建租户空间",
    okText: "创建",
    cancelText: "取消",
    confirmLoading: (__VLS_ctx.saving),
}));
const __VLS_34 = __VLS_33({
    ...{ 'onOk': {} },
    ...{ 'onCancel': {} },
    open: (__VLS_ctx.modalOpen),
    title: "新建租户空间",
    okText: "创建",
    cancelText: "取消",
    confirmLoading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
let __VLS_36;
let __VLS_37;
let __VLS_38;
const __VLS_39 = {
    onOk: (__VLS_ctx.submit)
};
const __VLS_40 = {
    onCancel: (...[$event]) => {
        __VLS_ctx.modalOpen = false;
    }
};
__VLS_35.slots.default;
const __VLS_41 = {}.AForm;
/** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    layout: "vertical",
}));
const __VLS_43 = __VLS_42({
    layout: "vertical",
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
__VLS_44.slots.default;
const __VLS_45 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
    label: "空间名称",
}));
const __VLS_47 = __VLS_46({
    label: "空间名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
__VLS_48.slots.default;
const __VLS_49 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：品牌运营团队",
}));
const __VLS_51 = __VLS_50({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：品牌运营团队",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
var __VLS_48;
const __VLS_53 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    label: "空间标识",
}));
const __VLS_55 = __VLS_54({
    label: "空间标识",
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
__VLS_56.slots.default;
const __VLS_57 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    value: (__VLS_ctx.form.slug),
    placeholder: "可选，例如：brand-ops",
}));
const __VLS_59 = __VLS_58({
    value: (__VLS_ctx.form.slug),
    placeholder: "可选，例如：brand-ops",
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
var __VLS_56;
var __VLS_44;
var __VLS_35;
/** @type {__VLS_StyleScopedClasses['review-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
/** @type {__VLS_StyleScopedClasses['table-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['member-name']} */ ;
/** @type {__VLS_StyleScopedClasses['member-email']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            workspace: workspace,
            workspaces: workspaces,
            modalOpen: modalOpen,
            saving: saving,
            form: form,
            currentRole: currentRole,
            reviewUsagePercent: reviewUsagePercent,
            runUsagePercent: runUsagePercent,
            columns: columns,
            roleLabel: roleLabel,
            switchTo: switchTo,
            submit: submit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
