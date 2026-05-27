import { onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { createWorkspaceMember, deleteWorkspaceMember, fetchWorkspaceMembers, updateWorkspaceMember } from "@/api";
const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const members = ref([]);
const form = reactive({
    name: "",
    email: "",
    role: "analyst"
});
const roleOptions = [
    { label: "所有者", value: "owner" },
    { label: "管理员", value: "admin" },
    { label: "分析师", value: "analyst" },
    { label: "只读", value: "viewer" }
];
const columns = [
    { title: "成员", key: "user", width: 320 },
    { title: "空间角色", key: "role", width: 180 },
    { title: "系统权限", key: "isSuperAdmin", width: 140 },
    { title: "加入时间", dataIndex: "createdAt", key: "createdAt", width: 220 },
    { title: "操作", key: "action", width: 120 }
];
async function load() {
    loading.value = true;
    try {
        members.value = await fetchWorkspaceMembers();
    }
    catch {
        members.value = [];
        message.error("当前角色没有权限访问用户管理");
    }
    finally {
        loading.value = false;
    }
}
function openCreate() {
    form.name = "";
    form.email = "";
    form.role = "analyst";
    modalOpen.value = true;
}
async function submit() {
    if (!form.name || !form.email) {
        message.error("请填写姓名和邮箱。");
        return;
    }
    saving.value = true;
    try {
        await createWorkspaceMember({ ...form });
        message.success("成员已保存。");
        modalOpen.value = false;
        await load();
    }
    catch {
        message.error("成员保存失败，请检查权限或输入信息");
    }
    finally {
        saving.value = false;
    }
}
async function changeRole(memberId, role) {
    try {
        await updateWorkspaceMember(memberId, { role });
        message.success("角色已更新。");
        await load();
    }
    catch {
        message.error("角色更新失败，请检查权限");
    }
}
function changeRoleFromSelect(memberId, role) {
    changeRole(memberId, role);
}
async function removeMember(memberId) {
    try {
        await deleteWorkspaceMember(memberId);
        message.success("成员已移除。");
        await load();
    }
    catch {
        message.error("成员移除失败，请检查权限");
    }
}
onMounted(load);
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
const __VLS_0 = {}.ASpace;
/** @type {[typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    wrap: true,
}));
const __VLS_2 = __VLS_1({
    wrap: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.load)
};
__VLS_7.slots.default;
var __VLS_7;
const __VLS_12 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_14 = __VLS_13({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onClick: (__VLS_ctx.openCreate)
};
__VLS_15.slots.default;
var __VLS_15;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-shell" },
});
const __VLS_20 = {}.ATable;
/** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.members),
    loading: (__VLS_ctx.loading),
    rowKey: "id",
    pagination: (false),
}));
const __VLS_22 = __VLS_21({
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.members),
    loading: (__VLS_ctx.loading),
    rowKey: "id",
    pagination: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
{
    const { bodyCell: __VLS_thisSlot } = __VLS_23.slots;
    const [{ column, record }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (column.key === 'user') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "member-cell" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "member-avatar" },
        });
        (record.user.name.slice(0, 1).toUpperCase());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "member-name" },
        });
        (record.user.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "member-email" },
        });
        (record.user.email);
    }
    else if (column.key === 'role') {
        const __VLS_24 = {}.ASelect;
        /** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ 'onChange': {} },
            value: (record.role),
            ...{ class: "role-select" },
        }));
        const __VLS_26 = __VLS_25({
            ...{ 'onChange': {} },
            value: (record.role),
            ...{ class: "role-select" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        let __VLS_28;
        let __VLS_29;
        let __VLS_30;
        const __VLS_31 = {
            onChange: (...[$event]) => {
                if (!!(column.key === 'user'))
                    return;
                if (!(column.key === 'role'))
                    return;
                __VLS_ctx.changeRoleFromSelect(record.id, $event);
            }
        };
        __VLS_27.slots.default;
        for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
            const __VLS_32 = {}.ASelectOption;
            /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                key: (role.value),
                value: (role.value),
            }));
            const __VLS_34 = __VLS_33({
                key: (role.value),
                value: (role.value),
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
            __VLS_35.slots.default;
            (role.label);
            var __VLS_35;
        }
        var __VLS_27;
    }
    else if (column.key === 'isSuperAdmin') {
        const __VLS_36 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            color: (record.user.isSuperAdmin ? 'purple' : 'default'),
        }));
        const __VLS_38 = __VLS_37({
            color: (record.user.isSuperAdmin ? 'purple' : 'default'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_39.slots.default;
        (record.user.isSuperAdmin ? "超管" : "普通用户");
        var __VLS_39;
    }
    else if (column.key === 'action') {
        const __VLS_40 = {}.APopconfirm;
        /** @type {[typeof __VLS_components.APopconfirm, typeof __VLS_components.aPopconfirm, typeof __VLS_components.APopconfirm, typeof __VLS_components.aPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            ...{ 'onConfirm': {} },
            title: "确定移除该成员？",
        }));
        const __VLS_42 = __VLS_41({
            ...{ 'onConfirm': {} },
            title: "确定移除该成员？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        let __VLS_44;
        let __VLS_45;
        let __VLS_46;
        const __VLS_47 = {
            onConfirm: (...[$event]) => {
                if (!!(column.key === 'user'))
                    return;
                if (!!(column.key === 'role'))
                    return;
                if (!!(column.key === 'isSuperAdmin'))
                    return;
                if (!(column.key === 'action'))
                    return;
                __VLS_ctx.removeMember(record.id);
            }
        };
        __VLS_43.slots.default;
        const __VLS_48 = {}.AButton;
        /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            danger: true,
            size: "small",
        }));
        const __VLS_50 = __VLS_49({
            danger: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_51.slots.default;
        var __VLS_51;
        var __VLS_43;
    }
}
var __VLS_23;
const __VLS_52 = {}.AModal;
/** @type {[typeof __VLS_components.AModal, typeof __VLS_components.aModal, typeof __VLS_components.AModal, typeof __VLS_components.aModal, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    ...{ 'onOk': {} },
    ...{ 'onCancel': {} },
    open: (__VLS_ctx.modalOpen),
    title: "邀请成员",
    okText: "保存",
    cancelText: "取消",
    confirmLoading: (__VLS_ctx.saving),
}));
const __VLS_54 = __VLS_53({
    ...{ 'onOk': {} },
    ...{ 'onCancel': {} },
    open: (__VLS_ctx.modalOpen),
    title: "邀请成员",
    okText: "保存",
    cancelText: "取消",
    confirmLoading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
let __VLS_56;
let __VLS_57;
let __VLS_58;
const __VLS_59 = {
    onOk: (__VLS_ctx.submit)
};
const __VLS_60 = {
    onCancel: (...[$event]) => {
        __VLS_ctx.modalOpen = false;
    }
};
__VLS_55.slots.default;
const __VLS_61 = {}.AForm;
/** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
    layout: "vertical",
}));
const __VLS_63 = __VLS_62({
    layout: "vertical",
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
__VLS_64.slots.default;
const __VLS_65 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
    label: "姓名",
}));
const __VLS_67 = __VLS_66({
    label: "姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
__VLS_68.slots.default;
const __VLS_69 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：运营同事",
}));
const __VLS_71 = __VLS_70({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：运营同事",
}, ...__VLS_functionalComponentArgsRest(__VLS_70));
var __VLS_68;
const __VLS_73 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
    label: "邮箱",
}));
const __VLS_75 = __VLS_74({
    label: "邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
__VLS_76.slots.default;
const __VLS_77 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({
    value: (__VLS_ctx.form.email),
    placeholder: "name@example.com",
}));
const __VLS_79 = __VLS_78({
    value: (__VLS_ctx.form.email),
    placeholder: "name@example.com",
}, ...__VLS_functionalComponentArgsRest(__VLS_78));
var __VLS_76;
const __VLS_81 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
    label: "角色",
}));
const __VLS_83 = __VLS_82({
    label: "角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_82));
__VLS_84.slots.default;
const __VLS_85 = {}.ASelect;
/** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
    value: (__VLS_ctx.form.role),
}));
const __VLS_87 = __VLS_86({
    value: (__VLS_ctx.form.role),
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
__VLS_88.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_89 = {}.ASelectOption;
    /** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
    // @ts-ignore
    const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
        key: (role.value),
        value: (role.value),
    }));
    const __VLS_91 = __VLS_90({
        key: (role.value),
        value: (role.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_90));
    __VLS_92.slots.default;
    (role.label);
    var __VLS_92;
}
var __VLS_88;
var __VLS_84;
var __VLS_64;
var __VLS_55;
/** @type {__VLS_StyleScopedClasses['review-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['table-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['member-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['member-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['member-name']} */ ;
/** @type {__VLS_StyleScopedClasses['member-email']} */ ;
/** @type {__VLS_StyleScopedClasses['role-select']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            saving: saving,
            modalOpen: modalOpen,
            members: members,
            form: form,
            roleOptions: roleOptions,
            columns: columns,
            load: load,
            openCreate: openCreate,
            submit: submit,
            changeRoleFromSelect: changeRoleFromSelect,
            removeMember: removeMember,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
