import { onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import axios from "axios";
import { createAdminUser, createAdminWorkspace, fetchAdminOverview, fetchAdminUsers, fetchAdminWorkspaces } from "@/api";
const loading = ref(false);
const saving = ref(false);
const userModalOpen = ref(false);
const workspaceModalOpen = ref(false);
const overview = ref(null);
const users = ref([]);
const workspaces = ref([]);
const forbidden = ref(false);
const userForm = reactive({
    name: "",
    email: "",
    isSuperAdmin: false
});
const workspaceForm = reactive({
    name: "",
    slug: "",
    planTier: "pro",
    monthlyReviewLimit: 20000,
    monthlyRunLimit: 200
});
const workspaceColumns = [
    { title: "空间", key: "name", width: 260 },
    { title: "套餐", dataIndex: "planTier", key: "planTier", width: 120 },
    { title: "成员", dataIndex: "memberCount", key: "memberCount", width: 100 },
    { title: "项目", dataIndex: "taskCount", key: "taskCount", width: 100 },
    { title: "用量", key: "usage", width: 320 },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 220 }
];
const userColumns = [
    { title: "用户", key: "user", width: 320 },
    { title: "权限", key: "isSuperAdmin", width: 140 },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 220 }
];
async function load() {
    loading.value = true;
    forbidden.value = false;
    try {
        const [overviewResult, userResult, workspaceResult] = await Promise.all([
            fetchAdminOverview(),
            fetchAdminUsers(),
            fetchAdminWorkspaces()
        ]);
        overview.value = overviewResult;
        users.value = userResult;
        workspaces.value = workspaceResult;
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            forbidden.value = true;
            return;
        }
        message.error("加载超管数据失败。");
    }
    finally {
        loading.value = false;
    }
}
function openUserModal() {
    userForm.name = "";
    userForm.email = "";
    userForm.isSuperAdmin = false;
    userModalOpen.value = true;
}
function openWorkspaceModal() {
    workspaceForm.name = "";
    workspaceForm.slug = "";
    workspaceForm.planTier = "pro";
    workspaceForm.monthlyReviewLimit = 20000;
    workspaceForm.monthlyRunLimit = 200;
    workspaceModalOpen.value = true;
}
async function submitUser() {
    if (!userForm.name || !userForm.email) {
        message.error("请填写姓名和邮箱。");
        return;
    }
    saving.value = true;
    try {
        await createAdminUser({ ...userForm });
        message.success("用户已保存。");
        userModalOpen.value = false;
        await load();
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            forbidden.value = true;
            message.error("当前账号没有超管权限。");
            return;
        }
        message.error("保存用户失败。");
    }
    finally {
        saving.value = false;
    }
}
async function submitWorkspace() {
    if (!workspaceForm.name || !workspaceForm.slug) {
        message.error("请填写空间名称和 slug。");
        return;
    }
    saving.value = true;
    try {
        await createAdminWorkspace({ ...workspaceForm });
        message.success("空间已创建。");
        workspaceModalOpen.value = false;
        await load();
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            forbidden.value = true;
            message.error("当前账号没有超管权限。");
            return;
        }
        message.error("创建空间失败。");
    }
    finally {
        saving.value = false;
    }
}
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.forbidden) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-shell" },
    });
    const __VLS_0 = {}.AResult;
    /** @type {[typeof __VLS_components.AResult, typeof __VLS_components.aResult, typeof __VLS_components.AResult, typeof __VLS_components.aResult, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        status: "403",
        title: "需要超管权限",
        subTitle: "当前账号没有平台级管理权限。请使用超管账号登录，或联系现有超管为你开通权限。",
    }));
    const __VLS_2 = __VLS_1({
        status: "403",
        title: "需要超管权限",
        subTitle: "当前账号没有平台级管理权限。请使用超管账号登录，或联系现有超管为你开通权限。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    {
        const { extra: __VLS_thisSlot } = __VLS_3.slots;
        const __VLS_4 = {}.AButton;
        /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_6 = __VLS_5({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        let __VLS_8;
        let __VLS_9;
        let __VLS_10;
        const __VLS_11 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.forbidden))
                    return;
                __VLS_ctx.$router.push('/dashboard');
            }
        };
        __VLS_7.slots.default;
        var __VLS_7;
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
    const __VLS_12 = {}.ASpace;
    /** @type {[typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        wrap: true,
    }));
    const __VLS_14 = __VLS_13({
        wrap: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    const __VLS_16 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.load)
    };
    __VLS_19.slots.default;
    var __VLS_19;
    const __VLS_24 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.openWorkspaceModal)
    };
    __VLS_27.slots.default;
    var __VLS_27;
    const __VLS_32 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (__VLS_ctx.openUserModal)
    };
    __VLS_35.slots.default;
    var __VLS_35;
    var __VLS_15;
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
    (__VLS_ctx.overview?.userCount || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card stat-card-success" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.overview?.workspaceCount || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card stat-card-accent" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.overview?.taskCount || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-title" },
    });
    const __VLS_40 = {}.ATable;
    /** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        columns: (__VLS_ctx.workspaceColumns),
        dataSource: (__VLS_ctx.workspaces),
        loading: (__VLS_ctx.loading),
        rowKey: "id",
    }));
    const __VLS_42 = __VLS_41({
        columns: (__VLS_ctx.workspaceColumns),
        dataSource: (__VLS_ctx.workspaces),
        loading: (__VLS_ctx.loading),
        rowKey: "id",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    {
        const { bodyCell: __VLS_thisSlot } = __VLS_43.slots;
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
        else if (column.key === 'planTier') {
            const __VLS_44 = {}.ATag;
            /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                color: "blue",
            }));
            const __VLS_46 = __VLS_45({
                color: "blue",
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
            __VLS_47.slots.default;
            (record.planTier);
            var __VLS_47;
        }
        else if (column.key === 'usage') {
            (record.currentPeriodReviewCount);
            (record.monthlyReviewLimit);
            (record.currentPeriodRunCount);
            (record.monthlyRunLimit);
        }
    }
    var __VLS_43;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-title" },
    });
    const __VLS_48 = {}.ATable;
    /** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        columns: (__VLS_ctx.userColumns),
        dataSource: (__VLS_ctx.users),
        loading: (__VLS_ctx.loading),
        rowKey: "id",
    }));
    const __VLS_50 = __VLS_49({
        columns: (__VLS_ctx.userColumns),
        dataSource: (__VLS_ctx.users),
        loading: (__VLS_ctx.loading),
        rowKey: "id",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    {
        const { bodyCell: __VLS_thisSlot } = __VLS_51.slots;
        const [{ column, record }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (column.key === 'user') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "member-cell" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "member-avatar" },
            });
            (record.name.slice(0, 1).toUpperCase());
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "member-name" },
            });
            (record.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "member-email" },
            });
            (record.email);
        }
        else if (column.key === 'isSuperAdmin') {
            const __VLS_52 = {}.ATag;
            /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
            // @ts-ignore
            const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                color: (record.isSuperAdmin ? 'purple' : 'default'),
            }));
            const __VLS_54 = __VLS_53({
                color: (record.isSuperAdmin ? 'purple' : 'default'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_53));
            __VLS_55.slots.default;
            (record.isSuperAdmin ? "超管" : "普通用户");
            var __VLS_55;
        }
    }
    var __VLS_51;
    const __VLS_56 = {}.AModal;
    /** @type {[typeof __VLS_components.AModal, typeof __VLS_components.aModal, typeof __VLS_components.AModal, typeof __VLS_components.aModal, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onOk': {} },
        ...{ 'onCancel': {} },
        open: (__VLS_ctx.userModalOpen),
        title: "新建平台用户",
        okText: "保存",
        cancelText: "取消",
        confirmLoading: (__VLS_ctx.saving),
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onOk': {} },
        ...{ 'onCancel': {} },
        open: (__VLS_ctx.userModalOpen),
        title: "新建平台用户",
        okText: "保存",
        cancelText: "取消",
        confirmLoading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onOk: (__VLS_ctx.submitUser)
    };
    const __VLS_64 = {
        onCancel: (...[$event]) => {
            if (!!(__VLS_ctx.forbidden))
                return;
            __VLS_ctx.userModalOpen = false;
        }
    };
    __VLS_59.slots.default;
    const __VLS_65 = {}.AForm;
    /** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
        layout: "vertical",
    }));
    const __VLS_67 = __VLS_66({
        layout: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
    __VLS_68.slots.default;
    const __VLS_69 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
        label: "姓名",
    }));
    const __VLS_71 = __VLS_70({
        label: "姓名",
    }, ...__VLS_functionalComponentArgsRest(__VLS_70));
    __VLS_72.slots.default;
    const __VLS_73 = {}.AInput;
    /** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
    // @ts-ignore
    const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
        value: (__VLS_ctx.userForm.name),
    }));
    const __VLS_75 = __VLS_74({
        value: (__VLS_ctx.userForm.name),
    }, ...__VLS_functionalComponentArgsRest(__VLS_74));
    var __VLS_72;
    const __VLS_77 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({
        label: "邮箱",
    }));
    const __VLS_79 = __VLS_78({
        label: "邮箱",
    }, ...__VLS_functionalComponentArgsRest(__VLS_78));
    __VLS_80.slots.default;
    const __VLS_81 = {}.AInput;
    /** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
    // @ts-ignore
    const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
        value: (__VLS_ctx.userForm.email),
    }));
    const __VLS_83 = __VLS_82({
        value: (__VLS_ctx.userForm.email),
    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
    var __VLS_80;
    const __VLS_85 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({}));
    const __VLS_87 = __VLS_86({}, ...__VLS_functionalComponentArgsRest(__VLS_86));
    __VLS_88.slots.default;
    const __VLS_89 = {}.ACheckbox;
    /** @type {[typeof __VLS_components.ACheckbox, typeof __VLS_components.aCheckbox, typeof __VLS_components.ACheckbox, typeof __VLS_components.aCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
        checked: (__VLS_ctx.userForm.isSuperAdmin),
    }));
    const __VLS_91 = __VLS_90({
        checked: (__VLS_ctx.userForm.isSuperAdmin),
    }, ...__VLS_functionalComponentArgsRest(__VLS_90));
    __VLS_92.slots.default;
    var __VLS_92;
    var __VLS_88;
    var __VLS_68;
    var __VLS_59;
    const __VLS_93 = {}.AModal;
    /** @type {[typeof __VLS_components.AModal, typeof __VLS_components.aModal, typeof __VLS_components.AModal, typeof __VLS_components.aModal, ]} */ ;
    // @ts-ignore
    const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
        ...{ 'onOk': {} },
        ...{ 'onCancel': {} },
        open: (__VLS_ctx.workspaceModalOpen),
        title: "新建租户空间",
        okText: "保存",
        cancelText: "取消",
        confirmLoading: (__VLS_ctx.saving),
    }));
    const __VLS_95 = __VLS_94({
        ...{ 'onOk': {} },
        ...{ 'onCancel': {} },
        open: (__VLS_ctx.workspaceModalOpen),
        title: "新建租户空间",
        okText: "保存",
        cancelText: "取消",
        confirmLoading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_94));
    let __VLS_97;
    let __VLS_98;
    let __VLS_99;
    const __VLS_100 = {
        onOk: (__VLS_ctx.submitWorkspace)
    };
    const __VLS_101 = {
        onCancel: (...[$event]) => {
            if (!!(__VLS_ctx.forbidden))
                return;
            __VLS_ctx.workspaceModalOpen = false;
        }
    };
    __VLS_96.slots.default;
    const __VLS_102 = {}.AForm;
    /** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        layout: "vertical",
    }));
    const __VLS_104 = __VLS_103({
        layout: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    __VLS_105.slots.default;
    const __VLS_106 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
        label: "空间名称",
    }));
    const __VLS_108 = __VLS_107({
        label: "空间名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_107));
    __VLS_109.slots.default;
    const __VLS_110 = {}.AInput;
    /** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
        value: (__VLS_ctx.workspaceForm.name),
        placeholder: "例如：品牌增长团队",
    }));
    const __VLS_112 = __VLS_111({
        value: (__VLS_ctx.workspaceForm.name),
        placeholder: "例如：品牌增长团队",
    }, ...__VLS_functionalComponentArgsRest(__VLS_111));
    var __VLS_109;
    const __VLS_114 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
        label: "Slug",
    }));
    const __VLS_116 = __VLS_115({
        label: "Slug",
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    __VLS_117.slots.default;
    const __VLS_118 = {}.AInput;
    /** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
    // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
        value: (__VLS_ctx.workspaceForm.slug),
        placeholder: "brand-growth",
    }));
    const __VLS_120 = __VLS_119({
        value: (__VLS_ctx.workspaceForm.slug),
        placeholder: "brand-growth",
    }, ...__VLS_functionalComponentArgsRest(__VLS_119));
    var __VLS_117;
    const __VLS_122 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
        label: "套餐",
    }));
    const __VLS_124 = __VLS_123({
        label: "套餐",
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    __VLS_125.slots.default;
    const __VLS_126 = {}.ASelect;
    /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
    // @ts-ignore
    const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
        value: (__VLS_ctx.workspaceForm.planTier),
    }));
    const __VLS_128 = __VLS_127({
        value: (__VLS_ctx.workspaceForm.planTier),
    }, ...__VLS_functionalComponentArgsRest(__VLS_127));
    __VLS_129.slots.default;
    const __VLS_130 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
        value: "free",
    }));
    const __VLS_132 = __VLS_131({
        value: "free",
    }, ...__VLS_functionalComponentArgsRest(__VLS_131));
    __VLS_133.slots.default;
    var __VLS_133;
    const __VLS_134 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
        value: "pro",
    }));
    const __VLS_136 = __VLS_135({
        value: "pro",
    }, ...__VLS_functionalComponentArgsRest(__VLS_135));
    __VLS_137.slots.default;
    var __VLS_137;
    const __VLS_138 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
        value: "business",
    }));
    const __VLS_140 = __VLS_139({
        value: "business",
    }, ...__VLS_functionalComponentArgsRest(__VLS_139));
    __VLS_141.slots.default;
    var __VLS_141;
    var __VLS_129;
    var __VLS_125;
    const __VLS_142 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
        label: "月评论额度",
    }));
    const __VLS_144 = __VLS_143({
        label: "月评论额度",
    }, ...__VLS_functionalComponentArgsRest(__VLS_143));
    __VLS_145.slots.default;
    const __VLS_146 = {}.AInputNumber;
    /** @type {[typeof __VLS_components.AInputNumber, typeof __VLS_components.aInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
        value: (__VLS_ctx.workspaceForm.monthlyReviewLimit),
        ...{ class: "full-input" },
        min: (0),
    }));
    const __VLS_148 = __VLS_147({
        value: (__VLS_ctx.workspaceForm.monthlyReviewLimit),
        ...{ class: "full-input" },
        min: (0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    var __VLS_145;
    const __VLS_150 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
        label: "月分析次数",
    }));
    const __VLS_152 = __VLS_151({
        label: "月分析次数",
    }, ...__VLS_functionalComponentArgsRest(__VLS_151));
    __VLS_153.slots.default;
    const __VLS_154 = {}.AInputNumber;
    /** @type {[typeof __VLS_components.AInputNumber, typeof __VLS_components.aInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
        value: (__VLS_ctx.workspaceForm.monthlyRunLimit),
        ...{ class: "full-input" },
        min: (0),
    }));
    const __VLS_156 = __VLS_155({
        value: (__VLS_ctx.workspaceForm.monthlyRunLimit),
        ...{ class: "full-input" },
        min: (0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_155));
    var __VLS_153;
    var __VLS_105;
    var __VLS_96;
}
/** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['table-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['page-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-success']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['table-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['table-title']} */ ;
/** @type {__VLS_StyleScopedClasses['member-name']} */ ;
/** @type {__VLS_StyleScopedClasses['member-email']} */ ;
/** @type {__VLS_StyleScopedClasses['table-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['table-title']} */ ;
/** @type {__VLS_StyleScopedClasses['member-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['member-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['member-name']} */ ;
/** @type {__VLS_StyleScopedClasses['member-email']} */ ;
/** @type {__VLS_StyleScopedClasses['full-input']} */ ;
/** @type {__VLS_StyleScopedClasses['full-input']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            saving: saving,
            userModalOpen: userModalOpen,
            workspaceModalOpen: workspaceModalOpen,
            overview: overview,
            users: users,
            workspaces: workspaces,
            forbidden: forbidden,
            userForm: userForm,
            workspaceForm: workspaceForm,
            workspaceColumns: workspaceColumns,
            userColumns: userColumns,
            load: load,
            openUserModal: openUserModal,
            openWorkspaceModal: openWorkspaceModal,
            submitUser: submitUser,
            submitWorkspace: submitWorkspace,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
