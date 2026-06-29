<template>
  <div class="auth-page">
    <a-dropdown :trigger="['click']">
      <button type="button" class="language-chip auth-language-chip" :aria-label="t('common.language')">
        <GlobalOutlined />
        <span>{{ currentLanguageLabel }}</span>
      </button>
      <template #overlay>
        <a-menu :selected-keys="[locale]" @click="handleLocaleMenuClick">
          <a-menu-item v-for="option in languageOptions" :key="option.value">
            {{ option.nativeLabel }}
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
    <div class="auth-panel">
      <div class="brand-block auth-brand">
        <div class="brand-mark">RI</div>
        <div>
          <div class="brand-title">ReviewIQ Cloud</div>
          <div class="brand-subtitle">{{ t("auth.loginSubtitle") }}</div>
        </div>
      </div>

      <a-form layout="vertical" @submit.prevent="submit">
        <a-form-item :label="t('auth.emailOrAccount')">
          <a-input v-model:value="form.email" :placeholder="t('auth.loginAccountPlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('auth.password')">
          <a-input-password v-model:value="form.password" autocomplete="current-password" :placeholder="t('auth.passwordPlaceholder')" />
        </a-form-item>
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">{{ t("auth.login") }}</a-button>
      </a-form>

      <div class="auth-footer">
        {{ t("auth.noAccount") }}
        <router-link to="/register">{{ t("auth.registerWithInvite") }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";
import { useRouter } from "vue-router";
import { GlobalOutlined } from "@ant-design/icons-vue";
import { login } from "@/api";
import { useTaskStore } from "@/composables";
import { type AppLocale, useI18n } from "@/i18n";

const router = useRouter();
const { setAuthState, refreshTasks } = useTaskStore();
const { locale, languageOptions, currentLanguageLabel, setLocale, t } = useI18n();
const loading = ref(false);
const form = reactive({
  email: "",
  password: ""
});

function handleLocaleMenuClick(event: { key: string | number }) {
  setLocale(String(event.key) as AppLocale);
}

async function submit() {
  if (!form.email || !form.password) {
    message.error(t("auth.loginRequired"));
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
        typeof error.response?.data?.message === "string" ? error.response.data.message : t("auth.loginFailed");
      message.error(messageText);
      return;
    }
    message.error(t("auth.loginRetry"));
  } finally {
    loading.value = false;
  }
}
</script>
