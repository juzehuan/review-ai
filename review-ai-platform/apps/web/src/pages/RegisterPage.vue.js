import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { useRouter } from "vue-router";
import { register } from "@/api";
import { useTaskStore } from "@/composables";
const router = useRouter();
const { setAuthState, refreshTasks } = useTaskStore();
const loading = ref(false);
const form = reactive({
    name: "",
    email: "",
    password: "",
    workspaceName: ""
});
async function submit() {
    if (!form.name || !form.email || form.password.length < 6 || !form.workspaceName) {
        message.error("请完整填写注册信息，密码至少 6 位。");
        return;
    }
    loading.value = true;
    try {
        const result = await register({ ...form });
        setAuthState(result.user, result.workspace);
        await refreshTasks();
        router.push("/dashboard");
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-block auth-brand" },
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
const __VLS_0 = {}.AForm;
/** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onSubmit': {} },
    layout: "vertical",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSubmit': {} },
    layout: "vertical",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onSubmit: (__VLS_ctx.submit)
};
__VLS_3.slots.default;
const __VLS_8 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    label: "姓名",
}));
const __VLS_10 = __VLS_9({
    label: "姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    value: (__VLS_ctx.form.name),
    placeholder: "你的姓名",
}));
const __VLS_14 = __VLS_13({
    value: (__VLS_ctx.form.name),
    placeholder: "你的姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
const __VLS_16 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "邮箱",
}));
const __VLS_18 = __VLS_17({
    label: "邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    value: (__VLS_ctx.form.email),
    placeholder: "name@example.com",
}));
const __VLS_22 = __VLS_21({
    value: (__VLS_ctx.form.email),
    placeholder: "name@example.com",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
const __VLS_24 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "密码",
}));
const __VLS_26 = __VLS_25({
    label: "密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.AInputPassword;
/** @type {[typeof __VLS_components.AInputPassword, typeof __VLS_components.aInputPassword, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    value: (__VLS_ctx.form.password),
    placeholder: "至少 6 位",
}));
const __VLS_30 = __VLS_29({
    value: (__VLS_ctx.form.password),
    placeholder: "至少 6 位",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_27;
const __VLS_32 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "工作空间名称",
}));
const __VLS_34 = __VLS_33({
    label: "工作空间名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    value: (__VLS_ctx.form.workspaceName),
    placeholder: "例如：品牌增长团队",
}));
const __VLS_38 = __VLS_37({
    value: (__VLS_ctx.form.workspaceName),
    placeholder: "例如：品牌增长团队",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_35;
const __VLS_40 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    block: true,
    loading: (__VLS_ctx.loading),
}));
const __VLS_42 = __VLS_41({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    block: true,
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_44;
let __VLS_45;
let __VLS_46;
const __VLS_47 = {
    onClick: (__VLS_ctx.submit)
};
__VLS_43.slots.default;
var __VLS_43;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-footer" },
});
const __VLS_48 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    to: "/login",
}));
const __VLS_50 = __VLS_49({
    to: "/login",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
var __VLS_51;
/** @type {__VLS_StyleScopedClasses['auth-page']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-block']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-footer']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            form: form,
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
