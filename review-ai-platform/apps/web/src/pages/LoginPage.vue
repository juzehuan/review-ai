<template>
  <div class="auth-page">
    <div class="auth-panel">
      <div class="brand-block auth-brand">
        <div class="brand-mark">RI</div>
        <div>
          <div class="brand-title">ReviewIQ Cloud</div>
          <div class="brand-subtitle">登录评论智能分析 SaaS</div>
        </div>
      </div>

      <a-form layout="vertical" @submit.prevent="submit">
        <a-form-item label="邮箱">
          <a-input v-model:value="form.email" placeholder="name@example.com" />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model:value="form.password" placeholder="至少 6 位" />
        </a-form-item>
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">登录</a-button>
      </a-form>

      <div class="auth-footer">
        还没有账号？
        <router-link to="/register">使用邀请码注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";
import { useRouter } from "vue-router";
import { login } from "@/api";
import { useTaskStore } from "@/composables";

const router = useRouter();
const { setAuthState, refreshTasks } = useTaskStore();
const loading = ref(false);
const form = reactive({
  email: "",
  password: ""
});

async function submit() {
  if (!form.email || !form.password) {
    message.error("请输入邮箱和密码。");
    return;
  }

  loading.value = true;
  try {
    const result = await login({ ...form });
    setAuthState(result.user, result.workspace);
    await refreshTasks();
    router.push("/dashboard");
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const messageText =
        typeof error.response?.data?.message === "string" ? error.response.data.message : "登录失败，请检查邮箱和密码。";
      message.error(messageText);
      return;
    }
    message.error("登录失败，请稍后重试。");
  } finally {
    loading.value = false;
  }
}
</script>
