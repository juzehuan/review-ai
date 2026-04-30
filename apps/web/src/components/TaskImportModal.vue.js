import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { importTask } from "@/api";
const __VLS_props = defineProps();
const emit = defineEmits();
const loading = ref(false);
const form = reactive({
    name: "",
    productName: "",
    sourceChannel: "Shopee",
    file: null
});
function onFileChange(event) {
    const target = event.target;
    form.file = target.files?.[0] || null;
}
async function submit() {
    if (!form.name || !form.productName || !form.file) {
        message.error("请完整填写任务信息并上传 CSV 文件。");
        return;
    }
    loading.value = true;
    try {
        const result = await importTask({
            name: form.name,
            productName: form.productName,
            sourceChannel: form.sourceChannel,
            file: form.file
        });
        message.success(`导入成功，共 ${result.reviewCount} 条评论。`);
        emit("success", result.taskId);
        emit("close");
    }
    catch (error) {
        const messageText = typeof error === "object" &&
            error &&
            "response" in error &&
            typeof error.response?.data?.error === "string"
            ? error.response.data.error
            : "导入失败，请检查 CSV 格式或后端服务状态。";
        message.error(messageText);
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.AModal;
/** @type {[typeof __VLS_components.AModal, typeof __VLS_components.aModal, typeof __VLS_components.AModal, typeof __VLS_components.aModal, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onCancel': {} },
    ...{ 'onOk': {} },
    open: (__VLS_ctx.open),
    title: "新建任务并导入评论",
    confirmLoading: (__VLS_ctx.loading),
    okText: "导入任务",
    cancelText: "取消",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onCancel': {} },
    ...{ 'onOk': {} },
    open: (__VLS_ctx.open),
    title: "新建任务并导入评论",
    confirmLoading: (__VLS_ctx.loading),
    okText: "导入任务",
    cancelText: "取消",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onCancel: (...[$event]) => {
        __VLS_ctx.emit('close');
    }
};
const __VLS_8 = {
    onOk: (__VLS_ctx.submit)
};
var __VLS_9 = {};
__VLS_3.slots.default;
const __VLS_10 = {}.AForm;
/** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
    layout: "vertical",
}));
const __VLS_12 = __VLS_11({
    layout: "vertical",
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
__VLS_13.slots.default;
const __VLS_14 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    label: "任务名称",
}));
const __VLS_16 = __VLS_15({
    label: "任务名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_17.slots.default;
const __VLS_18 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：Roborock Q7 评论分析",
}));
const __VLS_20 = __VLS_19({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：Roborock Q7 评论分析",
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
var __VLS_17;
const __VLS_22 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    label: "商品名称",
}));
const __VLS_24 = __VLS_23({
    label: "商品名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
__VLS_25.slots.default;
const __VLS_26 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    value: (__VLS_ctx.form.productName),
    placeholder: "例如：Roborock Q7 TF+",
}));
const __VLS_28 = __VLS_27({
    value: (__VLS_ctx.form.productName),
    placeholder: "例如：Roborock Q7 TF+",
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
var __VLS_25;
const __VLS_30 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    label: "来源渠道",
}));
const __VLS_32 = __VLS_31({
    label: "来源渠道",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
__VLS_33.slots.default;
const __VLS_34 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    value: (__VLS_ctx.form.sourceChannel),
}));
const __VLS_36 = __VLS_35({
    value: (__VLS_ctx.form.sourceChannel),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
var __VLS_33;
const __VLS_38 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    label: "CSV 文件",
}));
const __VLS_40 = __VLS_39({
    label: "CSV 文件",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_41.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.onFileChange) },
    type: "file",
    accept: ".csv",
});
var __VLS_41;
var __VLS_13;
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            emit: emit,
            loading: loading,
            form: form,
            onFileChange: onFileChange,
            submit: submit,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
