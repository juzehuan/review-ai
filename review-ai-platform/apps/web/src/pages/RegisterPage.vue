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
          <div class="brand-subtitle">{{ t("auth.registerSubtitle") }}</div>
        </div>
      </div>

      <a-form layout="vertical" @submit.prevent="submit">
        <a-form-item :label="t('auth.name')">
          <a-input v-model:value="form.name" :placeholder="t('auth.namePlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('auth.email')">
          <a-input v-model:value="form.email" :placeholder="t('auth.emailPlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('auth.password')">
          <a-input-password v-model:value="form.password" autocomplete="new-password" :placeholder="t('auth.passwordPlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('auth.inviteCode')">
          <a-input v-model:value="form.inviteCode" :placeholder="t('auth.inviteCodePlaceholder')" />
        </a-form-item>
        <a-alert
          class="import-alert"
          type="info"
          show-icon
          :message="t('auth.inviteNotice')"
        />
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">{{ t("auth.registerSubmit") }}</a-button>
      </a-form>

      <div class="auth-footer">
        {{ t("auth.hasAccount") }}
        <router-link to="/login">{{ t("auth.goLogin") }}</router-link>
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
import { register } from "@/api";
import { useTaskStore } from "@/composables";
import { type AppLocale, useI18n } from "@/i18n";

const router = useRouter();
const { setAuthState, refreshTasks } = useTaskStore();
const { locale, languageOptions, currentLanguageLabel, setLocale, t } = useI18n();
const loading = ref(false);
const form = reactive({
  name: "",
  email: "",
  password: "",
  inviteCode: ""
});

function handleLocaleMenuClick(event: { key: string | number }) {
  setLocale(String(event.key) as AppLocale);
}

async function submit() {
  if (!form.name || !form.email || form.password.length < 6 || !form.inviteCode) {
    message.error(t("auth.registerRequired"));
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
        typeof error.response?.data?.message === "string" ? error.response.data.message : t("auth.registerFailed");
      message.error(messageText);
      return;
    }
    message.error(t("auth.registerRetry"));
  } finally {
    loading.value = false;
  }
}
</script>
