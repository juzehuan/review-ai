import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { InboxOutlined } from "@ant-design/icons-vue";
import { importTask } from "@/api";
const __VLS_props = defineProps();
const emit = defineEmits();
const loading = ref(false);
const fileList = ref([]);
const form = reactive({
    name: "",
    productName: "",
    sourceChannel: "Shopee",
    file: null
});
function isSupportedFile(file) {
    const name = file.name.toLowerCase();
    return name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx");
}
const beforeUpload = (file) => {
    const rawFile = file;
    if (!isSupportedFile(rawFile)) {
        message.error("仅支持 CSV、XLS、XLSX 文件。");
        return false;
    }
    form.file = rawFile;
    fileList.value = [
        {
            uid: file.uid,
            name: file.name,
            status: "done",
            size: file.size,
            type: file.type
        }
    ];
    return false;
};
function removeFile() {
    form.file = null;
    fileList.value = [];
    return true;
}
async function submit() {
    if (!form.name || !form.productName || !form.file) {
        message.error("请填写项目名称、商品名称并上传评论文件。");
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
        form.name = "";
        form.productName = "";
        form.sourceChannel = "Shopee";
        removeFile();
    }
    catch (error) {
        const messageText = typeof error === "object" &&
            error &&
            "response" in error &&
            typeof error.response?.data?.message ===
                "string"
            ? error.response.data.message
            : "导入失败，请检查文件格式或后端服务状态。";
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
    title: "新建分析项目",
    width: "720px",
    confirmLoading: (__VLS_ctx.loading),
    okText: "导入并创建",
    cancelText: "取消",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onCancel': {} },
    ...{ 'onOk': {} },
    open: (__VLS_ctx.open),
    title: "新建分析项目",
    width: "720px",
    confirmLoading: (__VLS_ctx.loading),
    okText: "导入并创建",
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-modal-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-side-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-note-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-note-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-note-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-note-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-note-copy" },
});
const __VLS_10 = {}.AForm;
/** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
    layout: "vertical",
    ...{ class: "import-form" },
}));
const __VLS_12 = __VLS_11({
    layout: "vertical",
    ...{ class: "import-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
__VLS_13.slots.default;
const __VLS_14 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    label: "项目名称",
}));
const __VLS_16 = __VLS_15({
    label: "项目名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_17.slots.default;
const __VLS_18 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：Shopee 泰国 Q7 评论分析",
}));
const __VLS_20 = __VLS_19({
    value: (__VLS_ctx.form.name),
    placeholder: "例如：Shopee 泰国 Q7 评论分析",
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
    placeholder: "例如：Shopee / Lazada / Amazon",
}));
const __VLS_36 = __VLS_35({
    value: (__VLS_ctx.form.sourceChannel),
    placeholder: "例如：Shopee / Lazada / Amazon",
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
var __VLS_33;
const __VLS_38 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    label: "评论文件",
}));
const __VLS_40 = __VLS_39({
    label: "评论文件",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_41.slots.default;
const __VLS_42 = {}.AUploadDragger;
/** @type {[typeof __VLS_components.AUploadDragger, typeof __VLS_components.aUploadDragger, typeof __VLS_components.AUploadDragger, typeof __VLS_components.aUploadDragger, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    ...{ 'onRemove': {} },
    name: "file",
    maxCount: (1),
    multiple: (false),
    fileList: (__VLS_ctx.fileList),
    accept: ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    beforeUpload: (__VLS_ctx.beforeUpload),
}));
const __VLS_44 = __VLS_43({
    ...{ 'onRemove': {} },
    name: "file",
    maxCount: (1),
    multiple: (false),
    fileList: (__VLS_ctx.fileList),
    accept: ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    beforeUpload: (__VLS_ctx.beforeUpload),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
let __VLS_46;
let __VLS_47;
let __VLS_48;
const __VLS_49 = {
    onRemove: (__VLS_ctx.removeFile)
};
__VLS_45.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "ant-upload-drag-icon" },
});
const __VLS_50 = {}.InboxOutlined;
/** @type {[typeof __VLS_components.InboxOutlined, ]} */ ;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({}));
const __VLS_52 = __VLS_51({}, ...__VLS_functionalComponentArgsRest(__VLS_51));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "ant-upload-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "ant-upload-hint" },
});
var __VLS_45;
var __VLS_41;
var __VLS_13;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['import-modal-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['import-side-note']} */ ;
/** @type {__VLS_StyleScopedClasses['import-note-title']} */ ;
/** @type {__VLS_StyleScopedClasses['import-note-item']} */ ;
/** @type {__VLS_StyleScopedClasses['import-note-item']} */ ;
/** @type {__VLS_StyleScopedClasses['import-note-item']} */ ;
/** @type {__VLS_StyleScopedClasses['import-note-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['import-form']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-upload-drag-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-upload-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-upload-hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            InboxOutlined: InboxOutlined,
            emit: emit,
            loading: loading,
            fileList: fileList,
            form: form,
            beforeUpload: beforeUpload,
            removeFile: removeFile,
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
