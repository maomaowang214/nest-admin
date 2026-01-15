<template>
  <div class="account-settings-container">
    <Card>
      <Tabs v-model:activeKey="activeTab" type="card">
        <Tabs.TabPane key="profile" tab="个人信息">
          <Card :loading="profileLoading">
            <template #title>
              <Space>
                <UserOutlined />
                <span>基本信息</span>
              </Space>
            </template>
            <template #extra>
              <a-button type="primary" @click="handleEditProfile">
                <template #icon><EditOutlined /></template>
                编辑
              </a-button>
            </template>
            <Descriptions :column="{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }" bordered>
              <Descriptions.Item label="用户名">
                {{ accountInfo.username || '-' }}
              </Descriptions.Item>
              <Descriptions.Item label="昵称">
                {{ accountInfo.nickname || '-' }}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {{ accountInfo.email || '-' }}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">
                {{ accountInfo.phone || '-' }}
              </Descriptions.Item>
              <Descriptions.Item label="QQ">
                {{ accountInfo.qq || '-' }}
              </Descriptions.Item>
              <Descriptions.Item label="头像">
                <Avatar
                  :src="avatarError ? undefined : accountInfo.avatar"
                  :size="64"
                  :alt="accountInfo.username || 'User'"
                  @error="handleAvatarError"
                >
                  {{ accountInfo.username?.charAt(0)?.toUpperCase() || 'U' }}
                </Avatar>
              </Descriptions.Item>
              <Descriptions.Item label="备注" :span="2">
                {{ accountInfo.remark || '-' }}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane key="password" tab="安全设置">
          <Card>
            <template #title>
              <Space>
                <SafetyOutlined />
                <span>修改密码</span>
              </Space>
            </template>
            <Alert
              message="密码安全提示"
              description="密码必须包含数字和字母，长度6-16位。建议使用强密码保护账户安全。"
              type="info"
              show-icon
              class="mb-4"
            />
            <a-button type="primary" @click="handleChangePassword">
              <template #icon><LockOutlined /></template>
              修改密码
            </a-button>
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </Card>
  </div>
</template>

<script lang="ts" setup>
  import { ref, onMounted, computed } from 'vue';
  import {
    Card,
    Tabs,
    Descriptions,
    Space,
    Avatar,
    Alert,
    message,
  } from 'ant-design-vue';
  import {
    UserOutlined,
    EditOutlined,
    SafetyOutlined,
    LockOutlined,
  } from '@ant-design/icons-vue';
  import { useFormModal } from '@/hooks/useModal';
  import Api from '@/api/';
  import { getProfileSchemas, getPasswordSchemas } from './formSchemas';

  defineOptions({
    name: 'AccountSettings',
  });

  const activeTab = ref('profile');
  const profileLoading = ref(false);
  const accountInfo = ref<Partial<API.AccountInfo & { qq?: string }>>({});
  const [showModal] = useFormModal();

  // 获取账户信息
  const loadAccountInfo = async () => {
    try {
      profileLoading.value = true;
      avatarError.value = false; // 重置头像错误状态
      const data = await Api.account.accountProfile();
      accountInfo.value = data;
    }
    catch (error) {
      console.error('获取账户信息失败:', error);
      message.error('获取账户信息失败');
    }
    finally {
      profileLoading.value = false;
    }
  };

  // 使用 computed 缓存表单配置，避免重复创建
  const profileSchemas = computed(() => getProfileSchemas());
  const passwordSchemas = computed(() => getPasswordSchemas());

  // 头像加载失败处理
  const avatarError = ref(false);
  const handleAvatarError = () => {
    avatarError.value = true;
  };

  // 编辑个人信息
  const handleEditProfile = async () => {
    const [formRef] = await showModal({
      modalProps: {
        title: '编辑个人信息',
        width: 700,
        onFinish: async (values) => {
          try {
            await Api.account.accountUpdate(values);
            message.success('更新成功');
            await loadAccountInfo();
            return true;
          }
          catch (error) {
            message.error('更新失败');
            return false;
          }
        },
      },
      formProps: {
        labelWidth: 100,
        schemas: profileSchemas.value,
        initialValues: accountInfo.value,
      },
    });
  };

  // 修改密码
  const handleChangePassword = async () => {
    const [formRef] = await showModal({
      modalProps: {
        title: '修改密码',
        width: 600,
        onFinish: async (values) => {
          try {
            // 验证确认密码
            if (values.newPassword !== values.confirmPassword) {
              message.error('两次输入的密码不一致');
              return false;
            }
            // 只发送后端需要的字段，不发送 confirmPassword
            const { confirmPassword, ...passwordData } = values;
            await Api.account.accountPassword(passwordData);
            message.success('密码修改成功，请重新登录');
            // 延迟跳转，让用户看到成功提示
            setTimeout(() => {
              // 触发登出
              window.location.reload();
            }, 1500);
            return true;
          }
          catch (error: any) {
            message.error(error?.message || '密码修改失败');
            return false;
          }
        },
      },
      formProps: {
        labelWidth: 100,
        schemas: passwordSchemas.value,
      },
    });
  };


  onMounted(() => {
    loadAccountInfo();
  });
</script>

<style lang="less" scoped>
  .account-settings-container {
    padding: 20px;

    :deep(.ant-tabs-card) {
      .ant-tabs-content {
        margin-top: 16px;
      }
    }

    :deep(.ant-descriptions-item-label) {
      font-weight: 500;
      width: 150px;
    }
  }
</style>