<template>
  <div class="auth-page">
    <div class="auth-panel">
      <div class="brand-block auth-brand">
        <div class="brand-mark">RI</div>
        <div>
          <div class="brand-title">ReviewIQ Cloud</div>
          <div class="brand-subtitle">使用邀请码开通用户后台</div>
        </div>
      </div>

      <a-form layout="vertical" @submit.prevent="submit">
        <a-form-item label="姓名">
          <a-input v-model:value="form.name" placeholder="你的姓名" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model:value="form.email" placeholder="name@example.com" />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model:value="form.password" placeholder="至少 6 位" />
        </a-form-item>
        <a-form-item label="邀请码">
          <a-input v-model:value="form.inviteCode" placeholder="RI-XXXXXXXX-XXXXXX" />
        </a-form-item>
        <a-alert
          class="import-alert"
          type="info"
          show-icon
          message="普通用户注册必须使用超管生成的邀请码；每个邀请码只能使用一次。"
        />
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">注册并进入用户后台</a-button>
      </a-form>

      <div class="auth-footer">
        已有账号？
        <router-link to="/login">去登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import axios from "axios";
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
  inviteCode: ""
});

async function submit() {
  if (!form.name || !form.email || form.password.length < 6 || !form.inviteCode) {
    message.error("请完整填写注册信息，密码至少 6 位，并输入邀请码。");
    return;
  }

  loading.value = true;
  try {
    const result = await register({ ...form, inviteCode: form.inviteCode.trim().toUpperCase() });
    setAuthState(result.user, result.workspace);
    await refreshTasks();
    router.push("/dashboard");
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const messageText =
        typeof error.response?.data?.message === "string" ? error.response.data.message : "注册失败，请检查填写内容。";
      message.error(messageText);
      return;
    }
    message.error("注册失败，请稍后重试。");
  } finally {
    loading.value = false;
  }
}
</script>
