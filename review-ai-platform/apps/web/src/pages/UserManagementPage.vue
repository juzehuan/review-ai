<template>
  <div class="review-page">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">{{ tr("用户管理") }}</div>
        <div class="toolbar-subtitle">{{ tr("管理当前工作空间的成员、角色和访问权限。") }}</div>
      </div>
      <a-space wrap>
        <a-button @click="load" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          {{ tr("刷新") }}
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><UserAddOutlined /></template>
          {{ tr("邀请成员") }}
        </a-button>
      </a-space>
    </div>

    <div class="table-shell">
      <a-table :columns="columns" :data-source="members" :loading="loading" row-key="id" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <div class="member-cell">
              <div class="member-avatar">{{ record.user.name.slice(0, 1).toUpperCase() }}</div>
              <div>
                <div class="member-name">{{ record.user.name }}</div>
                <div class="member-email">{{ record.user.email }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-select :value="record.role" class="role-select" @change="changeRoleFromSelect(record.id, $event)">
              <a-select-option v-for="role in roleOptions" :key="role.value" :value="role.value">
                {{ tr(role.label) }}
              </a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'isSuperAdmin'">
            <a-tag :color="record.user.isSuperAdmin ? 'purple' : 'default'">
              {{ tr(record.user.isSuperAdmin ? "超管" : "普通用户") }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-popconfirm :title="tr('确定移除该成员？')" @confirm="removeMember(record.id)">
              <a-button danger size="small">{{ tr("移除") }}</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      :open="modalOpen"
      :title="tr('邀请成员')"
      :ok-text="tr('保存')"
      :cancel-text="tr('取消')"
      :confirm-loading="saving"
      @ok="submit"
      @cancel="modalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item :label="tr('姓名')">
          <a-input v-model:value="form.name" :placeholder="tr('例如：运营同事')" />
        </a-form-item>
        <a-form-item :label="tr('邮箱')">
          <a-input v-model:value="form.email" placeholder="name@example.com" />
        </a-form-item>
        <a-form-item :label="tr('角色')">
          <a-select v-model:value="form.role">
            <a-select-option v-for="role in roleOptions" :key="role.value" :value="role.value">
              {{ tr(role.label) }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { ReloadOutlined, UserAddOutlined } from "@ant-design/icons-vue";
import type { MemberRole, WorkspaceMemberDTO } from "@review-ai/shared";
import {
  createWorkspaceMember,
  deleteWorkspaceMember,
  fetchWorkspaceMembers,
  updateWorkspaceMember
} from "@/api";
import { translateStaticText } from "@/static-i18n";

const tr = (value: string) => translateStaticText(value);

const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const members = ref<WorkspaceMemberDTO[]>([]);
const form = reactive({
  name: "",
  email: "",
  role: "analyst" as MemberRole
});

const roleOptions: Array<{ label: string; value: MemberRole }> = [
  { label: "所有者", value: "owner" },
  { label: "管理员", value: "admin" },
  { label: "分析师", value: "analyst" },
  { label: "只读", value: "viewer" }
];

const columns = computed(() => [
  { title: tr("成员"), key: "user", width: 320 },
  { title: tr("空间角色"), key: "role", width: 180 },
  { title: tr("系统权限"), key: "isSuperAdmin", width: 140 },
  { title: tr("加入时间"), dataIndex: "createdAt", key: "createdAt", width: 220 },
  { title: tr("操作"), key: "action", width: 120 }
]);

async function load() {
  loading.value = true;
  try {
    members.value = await fetchWorkspaceMembers();
  } catch {
    members.value = [];
    message.error(tr("当前角色没有权限访问用户管理"));
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.name = "";
  form.email = "";
  form.role = "analyst";
  modalOpen.value = true;
}

async function submit() {
  if (!form.name || !form.email) {
    message.error(tr("请填写姓名和邮箱。"));
    return;
  }

  saving.value = true;
  try {
    await createWorkspaceMember({ ...form });
    message.success(tr("成员已保存。"));
    modalOpen.value = false;
    await load();
  } catch {
    message.error(tr("成员保存失败，请检查权限或输入信息"));
  } finally {
    saving.value = false;
  }
}

async function changeRole(memberId: string, role: MemberRole) {
  try {
    await updateWorkspaceMember(memberId, { role });
    message.success(tr("角色已更新。"));
    await load();
  } catch {
    message.error(tr("角色更新失败，请检查权限"));
  }
}

function changeRoleFromSelect(memberId: string, role: unknown) {
  changeRole(memberId, role as MemberRole);
}

async function removeMember(memberId: string) {
  try {
    await deleteWorkspaceMember(memberId);
    message.success(tr("成员已移除。"));
    await load();
  } catch {
    message.error(tr("成员移除失败，请检查权限"));
  }
}

onMounted(load);
</script>
