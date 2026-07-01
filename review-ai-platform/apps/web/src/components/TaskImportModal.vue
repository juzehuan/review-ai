<template>
  <a-modal
    :open="open"
    :title="appendTask ? t('import.appendTitle') : t('import.createTitle')"
    width="720px"
    :confirm-loading="loading"
    :ok-text="appendTask ? t('import.appendOk') : t('import.createOk')"
    :cancel-text="t('common.cancel')"
    @cancel="emit('close')"
    @ok="submit"
  >
    <div class="import-modal-layout">
      <div class="import-side-note">
        <div class="import-note-title">{{ t("import.supportedFormats") }}</div>
        <div class="import-note-item">CSV</div>
        <div class="import-note-item">Excel .xls</div>
        <div class="import-note-item">Excel .xlsx</div>
        <div class="import-note-copy">{{ t("import.fieldHint") }}</div>
      </div>

      <a-form layout="vertical" class="import-form">
        <a-alert
          v-if="appendTask"
          type="info"
          show-icon
          class="append-import-alert"
          :message="t('import.appendMessage', { name: appendTask.name })"
          :description="t('import.appendDescription')"
        />
        <a-form-item v-if="!appendTask" :label="t('import.projectName')">
          <a-input v-model:value="form.name" :placeholder="t('import.projectPlaceholder')" />
        </a-form-item>
        <a-form-item v-if="!appendTask" :label="contentNameMeta.label">
          <a-input v-model:value="form.productName" :placeholder="contentNameMeta.placeholder" />
        </a-form-item>
        <a-form-item v-if="!appendTask" :label="t('import.sourceChannel')">
          <a-select v-model:value="form.sourceChannel" :options="sourceChannelOptions" />
        </a-form-item>
        <a-form-item v-if="!appendTask" :label="t('import.analysisType')">
          <a-select v-model:value="form.analysisType" :options="analysisTypeOptions" />
          <div class="settings-help">{{ currentAnalysisTypeDescription }}</div>
          <div class="settings-help">{{ analysisTypeRecommendation }}</div>
        </a-form-item>
        <a-form-item :label="t('import.reviewFile')">
          <a-upload-dragger
            name="file"
            :max-count="1"
            :multiple="false"
            :file-list="fileList"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            :before-upload="beforeUpload"
            @remove="removeFile"
          >
            <p class="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p class="ant-upload-text">{{ t("import.uploadText") }}</p>
            <p class="ant-upload-hint">{{ t("import.uploadHint") }}</p>
          </a-upload-dragger>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import type { UploadProps } from "ant-design-vue";
import { InboxOutlined } from "@ant-design/icons-vue";
import { appendImport, importTask } from "@/api";
import {
  ANALYSIS_TYPE_PRESETS,
  SOURCE_CHANNEL_PRESETS,
  inferAnalysisType,
  type AnalysisType,
  type TaskListItem
} from "@review-ai/shared";
import { useI18n } from "@/i18n";

const props = defineProps<{ open: boolean; appendTask?: TaskListItem | null }>();
const emit = defineEmits<{
  close: [];
  success: [taskId: string];
}>();

const loading = ref(false);
const fileList = ref<UploadProps["fileList"]>([]);
const { t } = useI18n();
const form = reactive({
  name: "",
  productName: "",
  sourceChannel: "Shopee",
  analysisType: "product" as AnalysisType,
  file: null as File | null
});

const sourceChannelOptions = SOURCE_CHANNEL_PRESETS.map((channel) => ({
  label: channel.label,
  value: channel.value
}));
const analysisTypeOptions = computed(() => ANALYSIS_TYPE_PRESETS.map((item) => ({
  label: t(`analysisType.${item.value}`),
  value: item.value
})));

const contentNameMeta = computed(() => {
  if (form.analysisType === "video") {
    return {
      label: t("import.contentName.video"),
      placeholder: t("import.contentPlaceholder.video")
    };
  }
  if (form.analysisType === "tweet") {
    return {
      label: t("import.contentName.tweet"),
      placeholder: t("import.contentPlaceholder.tweet")
    };
  }
  return {
    label: t("import.contentName.product"),
    placeholder: t("import.contentPlaceholder.product")
  };
});

const currentAnalysisTypeDescription = computed(() => {
  return t(`analysisType.${form.analysisType}Description`);
});

const analysisTypeRecommendation = computed(() => {
  const recommended = inferAnalysisType(form.sourceChannel);
  const recommendedLabel = t(`analysisType.${recommended}`);
  const currentLabel = t(`analysisType.${form.analysisType}`);
  if (form.analysisType === recommended) {
    return t("import.analysisTypeRecommended", { type: recommendedLabel });
  }
  return t("import.analysisTypeMismatch", { recommended: recommendedLabel, current: currentLabel });
});

function isSupportedFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx");
}

const beforeUpload: UploadProps["beforeUpload"] = (file) => {
  const rawFile = file as File;
  if (!isSupportedFile(rawFile)) {
    message.error(t("import.fileTypeError"));
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

function resetForm() {
  form.name = "";
  form.productName = "";
  form.sourceChannel = "Shopee";
  form.analysisType = "product";
  removeFile();
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      removeFile();
    }
  }
);

watch(
  () => form.sourceChannel,
  (sourceChannel) => {
    form.analysisType = inferAnalysisType(sourceChannel);
  }
);

async function submit() {
  if (!form.file) {
    message.error(t("import.fileRequired"));
    return;
  }

  if (!props.appendTask && !form.name) {
    message.error(t("import.projectRequired"));
    return;
  }

  if (!props.appendTask && !form.productName) {
    message.error(t("import.contentRequired", { label: contentNameMeta.value.label }));
    return;
  }

  loading.value = true;
  try {
    if (props.appendTask) {
      const result = await appendImport(props.appendTask.id, form.file!);
      message.success(t("import.appendSuccess", { newRows: result.newRows, skippedRows: result.skippedRows }));
      emit("success", result.taskId);
    } else {
      const result = await importTask({
        name: form.name,
        productName: form.productName,
        sourceChannel: form.sourceChannel,
        analysisType: form.analysisType,
        file: form.file!
      });
      message.success(t("import.createSuccess", { reviewCount: result.reviewCount }));
      emit("success", result.taskId);
    }
    emit("close");
    resetForm();
  } catch (error: unknown) {
    const messageText =
      typeof error === "object" &&
      error &&
      "response" in error &&
      typeof (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message ===
        "string"
        ? (error as { response?: { data?: { message?: string } } }).response!.data!.message!
        : t("import.failed");
    message.error(messageText);
  } finally {
    loading.value = false;
  }
}
</script>
