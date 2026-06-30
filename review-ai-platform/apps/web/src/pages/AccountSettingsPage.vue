<template>
  <div class="review-page">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">{{ t("account.title") }}</div>
        <div class="toolbar-subtitle">{{ t("account.subtitle") }}</div>
      </div>
    </div>

    <div class="settings-grid">
      <section class="settings-panel">
        <div class="panel-label">{{ t("account.profile") }}</div>
        <div class="settings-title">{{ currentUser?.name || "-" }}</div>
        <div class="settings-meta">{{ currentUser?.email || "-" }}</div>
      </section>
      <section class="settings-panel">
        <div class="panel-label">{{ t("account.role") }}</div>
        <div class="settings-title">{{ currentUser?.isSuperAdmin ? t("common.superAdmin") : t("common.user") }}</div>
        <div class="settings-meta">{{ t("account.roleNote") }}</div>
      </section>
    </div>

    <div class="settings-layout settings-layout-single">
      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">{{ t("account.security") }}</div>
            <div class="settings-section-title">{{ t("shell.changePassword") }}</div>
          </div>
          <a-tag color="blue">{{ t("account.selfService") }}</a-tag>
        </div>
        <a-form layout="vertical" class="settings-form" @submit.prevent>
          <a-form-item :label="t('shell.oldPassword')">
            <a-input-password v-model:value="form.oldPassword" autocomplete="current-password" />
          </a-form-item>
          <a-form-item :label="t('shell.newPassword')">
            <a-input-password v-model:value="form.newPassword" autocomplete="new-password" :placeholder="t('shell.passwordPlaceholder')" />
          </a-form-item>
          <a-form-item :label="t('shell.confirmNewPassword')">
            <a-input-password v-model:value="form.confirmPassword" autocomplete="new-password" />
          </a-form-item>
          <a-space wrap>
            <a-button type="primary" :loading="saving" @click="submitPasswordChange">
              <template #icon><LockOutlined /></template>
              {{ t("account.savePassword") }}
            </a-button>
          </a-space>
        </a-form>
        <div class="settings-help">{{ t("account.passwordHelp") }}</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { LockOutlined } from "@ant-design/icons-vue";
import axios from "axios";
import { changePassword } from "@/api";
import { useTaskStore } from "@/composables";
import { useI18n } from "@/i18n";

const router = useRouter();
const { currentUser, clearAuthState } = useTaskStore();
const { t } = useI18n();
const saving = ref(false);
const form = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});

function resetForm() {
  form.oldPassword = "";
  form.newPassword = "";
  form.confirmPassword = "";
}

async function submitPasswordChange() {
  if (!form.oldPassword || !form.newPassword) {
    message.error(t("shell.passwordRequired"));
    return;
  }
  if (form.newPassword.length < 6) {
    message.error(t("shell.passwordTooShort"));
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    message.error(t("shell.passwordMismatch"));
    return;
  }

  saving.value = true;
  try {
    await changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    });
    message.success(t("shell.passwordChanged"));
    resetForm();
    clearAuthState();
    router.push("/login");
  } catch (error) {
    const text = axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
      ? error.response.data.message
      : t("shell.passwordChangeFailed");
    message.error(text);
  } finally {
    saving.value = false;
  }
}
</script>
