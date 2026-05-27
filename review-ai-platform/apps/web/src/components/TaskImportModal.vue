<template>
  <a-modal
    :open="open"
    title="新建分析项目"
    width="720px"
    :confirm-loading="loading"
    ok-text="导入并创建"
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
        <a-form-item label="项目名称">
          <a-input v-model:value="form.name" placeholder="例如：Shopee 泰国 Q7 评论分析" />
        </a-form-item>
        <a-form-item label="商品名称">
          <a-input v-model:value="form.productName" placeholder="例如：Roborock Q7 TF+" />
        </a-form-item>
        <a-form-item label="来源渠道">
          <a-input v-model:value="form.sourceChannel" placeholder="例如：Shopee / Lazada / Amazon" />
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
import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import type { UploadProps } from "ant-design-vue";
import { InboxOutlined } from "@ant-design/icons-vue";
import { importTask } from "@/api";

defineProps<{ open: boolean }>();
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
  file: null as File | null
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
