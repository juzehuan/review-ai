import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BarChartOutlined, CloudUploadOutlined, CrownOutlined, LogoutOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, TableOutlined, TeamOutlined } from "@ant-design/icons-vue";
import TaskImportModal from "@/components/TaskImportModal.vue";
import { getAuthToken, logout } from "@/api";
import { useTaskStore } from "@/composables";
const router = useRouter();
const route = useRoute();
const showImport = ref(false);
const { tasks, workspace, workspaces, currentUser, selectedTask, selectedTaskId, loadingTasks, refreshTasks, bootstrapAuth, switchWorkspace, setSelectedTask, clearAuthState } = useTaskStore();
const currentWorkspaceRole = computed(() => {
    const slug = workspace.value?.slug;
    return workspaces.value.find((item) => item.slug === slug)?.role || null;
});
const canManageUsers = computed(() => {
    return Boolean(currentUser.value?.isSuperAdmin ||
        currentWorkspaceRole.value === "owner" ||
        currentWorkspaceRole.value === "admin");
});
const canWriteWorkspace = computed(() => {
    return Boolean(currentUser.value?.isSuperAdmin ||
        currentWorkspaceRole.value === "owner" ||
        currentWorkspaceRole.value === "admin" ||
        currentWorkspaceRole.value === "analyst");
});
const navItems = computed(() => [
    { path: "/dashboard", label: "经营看板", icon: BarChartOutlined, disabled: false },
    { path: "/reviews", label: "评论工作台", icon: TableOutlined, disabled: false },
    ...(canManageUsers.value ? [{ path: "/users", label: "用户管理", icon: TeamOutlined, disabled: false }] : []),
    ...(currentUser.value?.isSuperAdmin
        ? [{ path: "/admin", label: "超管后台", icon: CrownOutlined, disabled: false }]
        : []),
    { path: "/settings", label: "空间设置", icon: SettingOutlined, disabled: false }
]);
const isPublicRoute = computed(() => Boolean(route.meta.public));
const currentTitle = computed(() => {
    if (route.path === "/reviews") {
        return "评论工作台";
    }
    if (route.path === "/users") {
        return "用户管理";
    }
    if (route.path === "/admin") {
        return "超管后台";
    }
    if (route.path === "/settings") {
        return "空间设置";
    }
    return "经营看板";
});
const usageText = computed(() => {
    if (!workspace.value) {
        return "0/0";
    }
    return `${workspace.value.currentPeriodReviewCount}/${workspace.value.monthlyReviewLimit}`;
});
const usagePercent = computed(() => {
    if (!workspace.value?.monthlyReviewLimit) {
        return 0;
    }
    return Math.min(Math.round((workspace.value.currentPeriodReviewCount / workspace.value.monthlyReviewLimit) * 100), 100);
});
const accountInitial = computed(() => (currentUser.value?.name || currentUser.value?.email || "U").slice(0, 1).toUpperCase());
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
    return "草稿";
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
async function handleImportSuccess(taskId) {
    await refreshTasks();
    setSelectedTask(taskId);
    router.push("/dashboard");
}
async function handleLogout() {
    await logout();
    clearAuthState();
    router.push("/login");
}
async function handleWorkspaceChange(slug) {
    if (typeof slug !== "string") {
        return;
    }
    await switchWorkspace(slug);
}
onMounted(() => {
    if (getAuthToken()) {
        bootstrapAuth();
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.isPublicRoute) {
    const __VLS_0 = {}.RouterView;
    /** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    const __VLS_4 = {}.ALayout;
    /** @type {[typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ class: "app-shell" },
    }));
    const __VLS_6 = __VLS_5({
        ...{ class: "app-shell" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    const __VLS_8 = {}.ALayoutSider;
    /** @type {[typeof __VLS_components.ALayoutSider, typeof __VLS_components.aLayoutSider, typeof __VLS_components.ALayoutSider, typeof __VLS_components.aLayoutSider, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        theme: "light",
        width: "288",
        ...{ class: "app-sidebar" },
    }));
    const __VLS_10 = __VLS_9({
        theme: "light",
        width: "288",
        ...{ class: "app-sidebar" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-mark" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "workspace-card-top" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_12 = {}.ATag;
    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        color: "blue",
    }));
    const __VLS_14 = __VLS_13({
        color: "blue",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    (__VLS_ctx.workspace?.planTier || "pro");
    var __VLS_15;
    const __VLS_16 = {}.ASelect;
    /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onChange': {} },
        value: (__VLS_ctx.workspace?.slug),
        ...{ class: "workspace-select" },
        bordered: (false),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onChange': {} },
        value: (__VLS_ctx.workspace?.slug),
        ...{ class: "workspace-select" },
        bordered: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onChange: (__VLS_ctx.handleWorkspaceChange)
    };
    __VLS_19.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.workspaces))) {
        const __VLS_24 = {}.ASelectOption;
        /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            key: (item.slug),
            value: (item.slug),
        }));
        const __VLS_26 = __VLS_25({
            key: (item.slug),
            value: (item.slug),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        (item.name);
        var __VLS_27;
    }
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "workspace-card-meta" },
    });
    (__VLS_ctx.usageText);
    const __VLS_28 = {}.AProgress;
    /** @type {[typeof __VLS_components.AProgress, typeof __VLS_components.aProgress, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        percent: (__VLS_ctx.usagePercent),
        showInfo: (false),
        size: "small",
    }));
    const __VLS_30 = __VLS_29({
        percent: (__VLS_ctx.usagePercent),
        showInfo: (false),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
        ...{ class: "side-nav" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.navItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.isPublicRoute))
                        return;
                    __VLS_ctx.router.push(item.path);
                } },
            key: (item.path),
            type: "button",
            ...{ class: "side-nav-item" },
            ...{ class: ({ active: __VLS_ctx.route.path === item.path, disabled: item.disabled }) },
            disabled: (item.disabled),
        });
        const __VLS_32 = ((item.icon));
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
        const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "current-project" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "project-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "project-name" },
    });
    (__VLS_ctx.selectedTask?.name || "尚未选择项目");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "project-desc" },
    });
    (__VLS_ctx.selectedTask?.productName || "导入评论 CSV 后开始分析");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "project-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selectedTask?.sourceChannel || "CSV");
    const __VLS_36 = {}.ATag;
    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        color: (__VLS_ctx.runStatusColor(__VLS_ctx.selectedTask?.latestRunStatus)),
    }));
    const __VLS_38 = __VLS_37({
        color: (__VLS_ctx.runStatusColor(__VLS_ctx.selectedTask?.latestRunStatus)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    (__VLS_ctx.runStatusLabel(__VLS_ctx.selectedTask?.latestRunStatus));
    var __VLS_39;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isPublicRoute))
                    return;
                __VLS_ctx.showImport = true;
            } },
        type: "button",
        ...{ class: "new-project-button" },
        disabled: (!__VLS_ctx.canWriteWorkspace),
    });
    const __VLS_40 = {}.PlusOutlined;
    /** @type {[typeof __VLS_components.PlusOutlined, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
    const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    var __VLS_11;
    const __VLS_44 = {}.ALayout;
    /** @type {[typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, typeof __VLS_components.ALayout, typeof __VLS_components.aLayout, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        ...{ class: "app-main" },
    }));
    const __VLS_46 = __VLS_45({
        ...{ class: "app-main" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "topbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topbar-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topbar-eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topbar-title" },
    });
    (__VLS_ctx.currentTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topbar-actions" },
    });
    const __VLS_48 = {}.ASelect;
    /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onChange': {} },
        value: (__VLS_ctx.selectedTaskId || undefined),
        placeholder: "切换分析项目",
        ...{ class: "task-select" },
        loading: (__VLS_ctx.loadingTasks),
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onChange': {} },
        value: (__VLS_ctx.selectedTaskId || undefined),
        placeholder: "切换分析项目",
        ...{ class: "task-select" },
        loading: (__VLS_ctx.loadingTasks),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onChange: (__VLS_ctx.setSelectedTask)
    };
    __VLS_51.slots.default;
    for (const [task] of __VLS_getVForSourceType((__VLS_ctx.tasks))) {
        const __VLS_56 = {}.ASelectOption;
        /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            key: (task.id),
            value: (task.id),
        }));
        const __VLS_58 = __VLS_57({
            key: (task.id),
            value: (task.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_59.slots.default;
        (task.name);
        var __VLS_59;
    }
    var __VLS_51;
    const __VLS_60 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loadingTasks),
    }));
    const __VLS_62 = __VLS_61({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loadingTasks),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    let __VLS_64;
    let __VLS_65;
    let __VLS_66;
    const __VLS_67 = {
        onClick: (__VLS_ctx.refreshTasks)
    };
    __VLS_63.slots.default;
    {
        const { icon: __VLS_thisSlot } = __VLS_63.slots;
        const __VLS_68 = {}.ReloadOutlined;
        /** @type {[typeof __VLS_components.ReloadOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
        const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
    }
    var __VLS_63;
    const __VLS_72 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        type: "primary",
        disabled: (!__VLS_ctx.canWriteWorkspace),
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        type: "primary",
        disabled: (!__VLS_ctx.canWriteWorkspace),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.isPublicRoute))
                return;
            __VLS_ctx.showImport = true;
        }
    };
    __VLS_75.slots.default;
    {
        const { icon: __VLS_thisSlot } = __VLS_75.slots;
        const __VLS_80 = {}.CloudUploadOutlined;
        /** @type {[typeof __VLS_components.CloudUploadOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
        const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
    }
    var __VLS_75;
    const __VLS_84 = {}.ADropdown;
    /** @type {[typeof __VLS_components.ADropdown, typeof __VLS_components.aDropdown, typeof __VLS_components.ADropdown, typeof __VLS_components.aDropdown, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
    const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "button",
        ...{ class: "account-chip" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "account-avatar" },
    });
    (__VLS_ctx.accountInitial);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "account-name" },
    });
    (__VLS_ctx.currentUser?.name || "账号");
    {
        const { overlay: __VLS_thisSlot } = __VLS_87.slots;
        const __VLS_88 = {}.AMenu;
        /** @type {[typeof __VLS_components.AMenu, typeof __VLS_components.aMenu, typeof __VLS_components.AMenu, typeof __VLS_components.aMenu, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
        const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
        __VLS_91.slots.default;
        const __VLS_92 = {}.AMenuItem;
        /** @type {[typeof __VLS_components.AMenuItem, typeof __VLS_components.aMenuItem, typeof __VLS_components.AMenuItem, typeof __VLS_components.aMenuItem, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            key: "email",
            disabled: true,
        }));
        const __VLS_94 = __VLS_93({
            key: "email",
            disabled: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        __VLS_95.slots.default;
        (__VLS_ctx.currentUser?.email || "-");
        var __VLS_95;
        const __VLS_96 = {}.AMenuDivider;
        /** @type {[typeof __VLS_components.AMenuDivider, typeof __VLS_components.aMenuDivider, ]} */ ;
        // @ts-ignore
        const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
        const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
        const __VLS_100 = {}.AMenuItem;
        /** @type {[typeof __VLS_components.AMenuItem, typeof __VLS_components.aMenuItem, typeof __VLS_components.AMenuItem, typeof __VLS_components.aMenuItem, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            ...{ 'onClick': {} },
            key: "logout",
        }));
        const __VLS_102 = __VLS_101({
            ...{ 'onClick': {} },
            key: "logout",
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        let __VLS_104;
        let __VLS_105;
        let __VLS_106;
        const __VLS_107 = {
            onClick: (__VLS_ctx.handleLogout)
        };
        __VLS_103.slots.default;
        const __VLS_108 = {}.LogoutOutlined;
        /** @type {[typeof __VLS_components.LogoutOutlined, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
        const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
        var __VLS_103;
        var __VLS_91;
    }
    var __VLS_87;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "app-content" },
    });
    const __VLS_112 = {}.RouterView;
    /** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({}));
    const __VLS_114 = __VLS_113({}, ...__VLS_functionalComponentArgsRest(__VLS_113));
    var __VLS_47;
    var __VLS_7;
}
/** @type {[typeof TaskImportModal, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(TaskImportModal, new TaskImportModal({
    ...{ 'onClose': {} },
    ...{ 'onSuccess': {} },
    open: (__VLS_ctx.showImport),
}));
const __VLS_117 = __VLS_116({
    ...{ 'onClose': {} },
    ...{ 'onSuccess': {} },
    open: (__VLS_ctx.showImport),
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
let __VLS_119;
let __VLS_120;
let __VLS_121;
const __VLS_122 = {
    onClose: (...[$event]) => {
        __VLS_ctx.showImport = false;
    }
};
const __VLS_123 = {
    onSuccess: (__VLS_ctx.handleImportSuccess)
};
var __VLS_118;
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['app-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-block']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card-top']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-select']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['current-project']} */ ;
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-name']} */ ;
/** @type {__VLS_StyleScopedClasses['project-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['project-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['new-project-button']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-left']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['task-select']} */ ;
/** @type {__VLS_StyleScopedClasses['account-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['account-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['account-name']} */ ;
/** @type {__VLS_StyleScopedClasses['app-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CloudUploadOutlined: CloudUploadOutlined,
            LogoutOutlined: LogoutOutlined,
            PlusOutlined: PlusOutlined,
            ReloadOutlined: ReloadOutlined,
            TaskImportModal: TaskImportModal,
            router: router,
            route: route,
            showImport: showImport,
            tasks: tasks,
            workspace: workspace,
            workspaces: workspaces,
            currentUser: currentUser,
            selectedTask: selectedTask,
            selectedTaskId: selectedTaskId,
            loadingTasks: loadingTasks,
            refreshTasks: refreshTasks,
            setSelectedTask: setSelectedTask,
            canWriteWorkspace: canWriteWorkspace,
            navItems: navItems,
            isPublicRoute: isPublicRoute,
            currentTitle: currentTitle,
            usageText: usageText,
            usagePercent: usagePercent,
            accountInitial: accountInitial,
            runStatusLabel: runStatusLabel,
            runStatusColor: runStatusColor,
            handleImportSuccess: handleImportSuccess,
            handleLogout: handleLogout,
            handleWorkspaceChange: handleWorkspaceChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
