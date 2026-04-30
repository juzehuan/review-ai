<template>
  <div class="new-task-page">
    <div class="new-task-back" @click="router.push('/')">
      <LeftOutlined /> 返回任务列表
    </div>

    <div class="new-task-card">
      <div class="new-task-header">
        <div class="new-task-title">新增分析任务</div>
        <div class="new-task-sub">填写任务基本信息并上传 Shopee 评论 CSV 文件，完成后自动进入任务看板。</div>
      </div>

      <a-form
        :model="form"
        layout="vertical"
        class="new-task-form"
        @finish="submit"
      >
        <div class="form-row">
          <a-form-item
            label="任务名称"
            name="name"
            :rules="[{ required: true, message: '请输入任务名称' }]"
          >
            <a-input
              v-model:value="form.name"
              placeholder="例如：Roborock Q7 Max TH - 2025 Q1 评论分析"
              size="large"
            />
          </a-form-item>

          <a-form-item
            label="商品名称"
            name="productName"
            :rules="[{ required: true, message: '请输入商品名称' }]"
          >
            <a-input
              v-model:value="form.productName"
              placeholder="例如：Roborock Q7 Max+"
              size="large"
            />
          </a-form-item>
        </div>

        <a-form-item label="来源渠道" name="sourceChannel">
          <a-select v-model:value="form.sourceChannel" size="large">
            <a-select-option value="Shopee">Shopee</a-select-option>
            <a-select-option value="Lazada">Lazada</a-select-option>
            <a-select-option value="TikTok Shop">TikTok Shop</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item
          label="评论 CSV 文件"
          name="file"
          :rules="[{ required: true, validator: validateFile }]"
        >
          <div
            class="upload-zone"
            :class="{ 'upload-zone-active': dragOver, 'upload-zone-has-file': form.file }"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
            @click="fileInput?.click()"
          >
            <template v-if="!form.file">
              <InboxOutlined class="upload-icon" />
              <div class="upload-text">点击或拖拽 CSV 文件到此处</div>
              <div class="upload-hint">支持 Shopee 评论导出格式，UTF-8 编码，文件大小不限</div>
            </template>
            <template v-else>
              <FileTextOutlined class="upload-icon upload-icon-done" />
              <div class="upload-text upload-text-done">{{ form.file.name }}</div>
              <div class="upload-hint">{{ (form.file.size / 1024).toFixed(1) }} KB — 点击重新选择</div>
            </template>
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              style="display: none"
              @change="onFileChange"
            />
          </div>
        </a-form-item>

        <div class="new-task-footer">
          <a-button size="large" @click="router.push('/')">取消</a-button>
          <a-button
            type="primary"
            size="large"
            html-type="submit"
            :loading="loading"
          >
            <template #icon><CloudUploadOutlined /></template>
            创建任务并导入
          </a-button>
        </div>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  CloudUploadOutlined,
  FileTextOutlined,
  InboxOutlined,
  LeftOutlined
} from "@ant-design/icons-vue";
import { importTask } from "@/api";

const router = useRouter();
const loading = ref(false);
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const form = reactive({
  name: "",
  productName: "",
  sourceChannel: "Shopee",
  file: null as File | null
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  form.file = input.files?.[0] || null;
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.name.endsWith(".csv")) {
    form.file = file;
  } else {
    message.error("请上传 .csv 格式文件。");
  }
}

function validateFile(_: unknown, value: unknown) {
  return form.file ? Promise.resolve() : Promise.reject("请上传 CSV 文件");
}

async function submit() {
  if (!form.file) return;
  loading.value = true;
  try {
    const result = await importTask({
      name: form.name.trim(),
      productName: form.productName.trim(),
      sourceChannel: form.sourceChannel,
      file: form.file
    });
    message.success(`导入成功，共 ${result.reviewCount} 条评论。`);
    router.push(`/tasks/${result.taskId}/dashboard`);
  } catch (err: unknown) {
    const errMsg =
      typeof err === "object" &&
      err &&
      "response" in err &&
      typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
        ? (err as { response?: { data?: { error?: string } } }).response!.data!.error!
        : "导入失败，请检查 CSV 格式。";
    message.error(errMsg);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.new-task-page {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.new-task-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #516079;
  cursor: pointer;
  transition: color 0.18s;
  width: fit-content;
}

.new-task-back:hover {
  color: #1f3d8a;
}

.new-task-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(229, 234, 244, 0.95);
  border-radius: 24px;
  padding: 36px 40px;
  box-shadow: 0 12px 40px rgba(26, 38, 64, 0.08);
}

.new-task-header {
  margin-bottom: 32px;
}

.new-task-title {
  font-size: 22px;
  font-weight: 800;
  color: #1a2844;
}

.new-task-sub {
  margin-top: 8px;
  font-size: 13px;
  color: #7b8494;
}

.new-task-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.upload-zone {
  border: 2px dashed rgba(166, 180, 220, 0.7);
  border-radius: 16px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: rgba(247, 250, 255, 0.6);
}

.upload-zone:hover,
.upload-zone-active {
  border-color: #6a82fb;
  background: rgba(235, 241, 255, 0.7);
}

.upload-zone-has-file {
  border-color: #52c41a;
  background: rgba(240, 255, 244, 0.7);
}

.upload-icon {
  font-size: 40px;
  color: #a0aec0;
}

.upload-icon-done {
  color: #52c41a;
}

.upload-text {
  font-size: 15px;
  font-weight: 600;
  color: #243042;
}

.upload-text-done {
  color: #389e0d;
}

.upload-hint {
  font-size: 12px;
  color: #98a1b2;
}

.new-task-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid rgba(229, 234, 244, 0.8);
}

@media (max-width: 640px) {
  .new-task-card {
    padding: 24px 20px;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
