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
        <a-segmented
          v-if="!appendTask"
          v-model:value="importMode"
          :options="[
            { label: '文件导入', value: 'file' },
            { label: '链接抓取', value: 'crawl' }
          ]"
          class="import-mode-switch"
        />
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
          <a-input v-model:value="form.sourceChannel" placeholder="例如：Shopee / Lazada / Amazon" />
        </a-form-item>
        <template v-if="importMode === 'crawl' && !appendTask">
          <a-form-item label="商品链接">
            <a-input v-model:value="form.productUrl" placeholder="例如：https://shopee.co.th/xxx-i.123.456" />
          </a-form-item>
          <a-form-item label="最多抓取条数">
            <a-input-number v-model:value="form.maxReviews" :min="1" :max="1000" class="full-input" />
          </a-form-item>
        </template>
        <a-form-item v-else label="评论文件">
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
import { reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import type { UploadProps } from "ant-design-vue";
import { InboxOutlined } from "@ant-design/icons-vue";
import { appendImport, crawlTask, fetchWorkspaceCrawlerSettings, importTask } from "@/api";
import type { TaskListItem } from "@review-ai/shared";

const props = defineProps<{ open: boolean; appendTask?: TaskListItem | null }>();
const emit = defineEmits<{
  close: [];
  success: [taskId: string];
}>();

const loading = ref(false);
const loadingCrawlerDefaults = ref(false);
const fileList = ref<UploadProps["fileList"]>([]);
const importMode = ref<"file" | "crawl">("file");
const form = reactive({
  name: "",
  productName: "",
  sourceChannel: "Shopee",
  productUrl: "",
  maxReviews: 200,
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

function resetForm() {
  form.name = "";
  form.productName = "";
  form.sourceChannel = "Shopee";
  form.productUrl = "";
  form.maxReviews = 200;
  importMode.value = "file";
  removeFile();
}

async function loadCrawlerDefaults() {
  if (props.appendTask || loadingCrawlerDefaults.value) {
    return;
  }
  loadingCrawlerDefaults.value = true;
  try {
    const setting = await fetchWorkspaceCrawlerSettings();
    form.sourceChannel = setting.defaultSourceChannel || "Shopee";
    form.maxReviews = setting.defaultMaxReviews || 200;
  } catch {
    // 导入弹窗仍然可以使用手工填写值，设置加载失败时不阻塞导入。
  } finally {
    loadingCrawlerDefaults.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      loadCrawlerDefaults();
    }
  }
);

async function submit() {
  if ((props.appendTask || importMode.value === "file") && !form.file) {
    message.error("请上传评论文件。");
    return;
  }

  if (!props.appendTask && (!form.name || !form.productName)) {
    message.error("请填写项目名称和商品名称。");
    return;
  }

  if (!props.appendTask && importMode.value === "crawl" && !form.productUrl) {
    message.error("请填写商品链接。");
    return;
  }

  loading.value = true;
  try {
    if (props.appendTask) {
      const result = await appendImport(props.appendTask.id, form.file!);
      message.success(`追加完成：新增 ${result.newRows} 条，跳过 ${result.skippedRows} 条。`);
      emit("success", result.taskId);
    } else if (importMode.value === "crawl") {
      const result = await crawlTask({
        name: form.name,
        productName: form.productName,
        sourceChannel: form.sourceChannel,
        productUrl: form.productUrl,
        maxReviews: form.maxReviews
      });
      message.success(`抓取成功：导入 ${result.reviewCount} 条评论。`);
      emit("success", result.taskId);
    } else {
      const result = await importTask({
        name: form.name,
        productName: form.productName,
        sourceChannel: form.sourceChannel,
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
