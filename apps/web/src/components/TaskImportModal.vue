<template>
  <a-modal
    :open="open"
    title="新建任务并导入评论"
    @cancel="emit('close')"
    @ok="submit"
    :confirm-loading="loading"
    ok-text="导入任务"
    cancel-text="取消"
  >
    <a-form layout="vertical">
      <a-form-item label="任务名称">
        <a-input v-model:value="form.name" placeholder="例如：Roborock Q7 评论分析" />
      </a-form-item>
      <a-form-item label="商品名称">
        <a-input v-model:value="form.productName" placeholder="例如：Roborock Q7 TF+" />
      </a-form-item>
      <a-form-item label="来源渠道">
        <a-input v-model:value="form.sourceChannel" />
      </a-form-item>
      <a-form-item label="CSV 文件">
        <input type="file" accept=".csv" @change="onFileChange" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, h } from "vue";
import { message, Modal } from "ant-design-vue";
import { importTask } from "@/api";

defineProps<{ open: boolean }>();
const emit = defineEmits<{
  close: [];
  success: [taskId: string];
}>();

const loading = ref(false);
const form = reactive({
  name: "",
  productName: "",
  sourceChannel: "Shopee",
  file: null as File | null
});

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
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
    const totalDropped = result.droppedEmpty + result.droppedDuplicate + result.droppedByDb;
    if (totalDropped > 0) {
      Modal.info({
        title: `导入完成：写入 ${result.reviewCount} / 共 ${result.csvTotal} 条`,
        content: h("div", null, [
          h("p", null, `CSV 解析行数：${result.csvTotal}`),
          h("p", null, `已写入数据库：${result.reviewCount}`),
          h("p", { style: "color:#d46b08" }, `因评论内容为空跳过：${result.droppedEmpty}`),
          h("p", { style: "color:#d46b08" }, `因 cmtId 在 CSV 内重复跳过：${result.droppedDuplicate}`),
          h("p", { style: "color:#d46b08" }, `因数据库唯一索引兜底跳过：${result.droppedByDb}`)
        ])
      });
    } else {
      message.success(`导入成功，共 ${result.reviewCount} 条评论。`);
    }
    emit("success", result.taskId);
    emit("close");
  } catch (error: unknown) {
    const messageText =
      typeof error === "object" &&
      error &&
      "response" in error &&
      typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : "导入失败，请检查 CSV 格式或后端服务状态。";
    message.error(messageText);
  } finally {
    loading.value = false;
  }
}
</script>
