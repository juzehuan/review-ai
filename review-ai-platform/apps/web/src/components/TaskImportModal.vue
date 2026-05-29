<template>
  <a-modal
    :open="open"
    :title="appendTask ? '追加评论' : '新建分析项目'"
    width="720px"
    :confirm-loading="loading"
    :ok-text="appendTask ? '追加导入' : '导入并创建'"
    cancel-text="取消"
    @cancel="emit('close')"
    @ok="submit"
  >
    <div class="import-modal-layout">
      <div class="import-side-note">
        <div class="import-note-title">支持格式</div>
        <div class="import-note-item">CSV</div>
        <div class="import-note-item">Excel .xls</div>
        <div class="import-note-item">Excel .xlsx</div>
        <div class="import-note-copy">字段表头需包含 cmtid、rating_star、comment 或 comment_tr。</div>
      </div>

      <a-form layout="vertical" class="import-form">
        <a-alert
          v-if="appendTask"
          type="info"
          show-icon
          class="append-import-alert"
          :message="`追加到：${appendTask.name}`"
          description="已存在的评论 ID 会自动跳过，只会导入新增评论。追加后请重新发起分析以覆盖新增样本。"
        />
        <a-form-item v-if="!appendTask" label="项目名称">
          <a-input v-model:value="form.name" placeholder="例如：Shopee 泰国 Q7 评论分析" />
        </a-form-item>
        <a-form-item v-if="!appendTask" label="商品名称">
          <a-input v-model:value="form.productName" placeholder="例如：Roborock Q7 TF+" />
        </a-form-item>
        <a-form-item v-if="!appendTask" label="来源渠道">
          <a-select v-model:value="form.sourceChannel" :options="sourceChannelOptions" />
        </a-form-item>
        <a-form-item v-if="!appendTask" label="分析类型">
          <a-select v-model:value="form.analysisType" :options="analysisTypeOptions" />
          <div class="settings-help">{{ currentAnalysisTypeDescription }}</div>
        </a-form-item>
        <a-form-item label="评论文件">
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
            <p class="ant-upload-text">拖拽文件到这里，或点击选择文件</p>
            <p class="ant-upload-hint">支持 CSV、XLS、XLSX，单次上传 1 个文件。</p>
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

const props = defineProps<{ open: boolean; appendTask?: TaskListItem | null }>();
const emit = defineEmits<{
  close: [];
  success: [taskId: string];
}>();

const loading = ref(false);
const fileList = ref<UploadProps["fileList"]>([]);
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
const analysisTypeOptions = ANALYSIS_TYPE_PRESETS.map((item) => ({
  label: item.label,
  value: item.value
}));

const currentAnalysisTypeDescription = computed(() => {
  return ANALYSIS_TYPE_PRESETS.find((item) => item.value === form.analysisType)?.description || "";
});

function isSupportedFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx");
}

const beforeUpload: UploadProps["beforeUpload"] = (file) => {
  const rawFile = file as File;
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
    message.error("请上传评论文件。");
    return;
  }

  if (!props.appendTask && !form.name) {
    message.error("请填写项目名称。");
    return;
  }

  if (!props.appendTask && !form.productName) {
    message.error("请填写项目名称和商品名称。");
    return;
  }

  loading.value = true;
  try {
    if (props.appendTask) {
      const result = await appendImport(props.appendTask.id, form.file!);
      message.success(`追加完成：新增 ${result.newRows} 条，跳过 ${result.skippedRows} 条。`);
      emit("success", result.taskId);
    } else {
      const result = await importTask({
        name: form.name,
        productName: form.productName,
        sourceChannel: form.sourceChannel,
        analysisType: form.analysisType,
        file: form.file!
      });
      message.success(`导入成功，共 ${result.reviewCount} 条评论。`);
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
        : "导入失败，请检查文件格式或后端服务状态。";
    message.error(messageText);
  } finally {
    loading.value = false;
  }
}
</script>
