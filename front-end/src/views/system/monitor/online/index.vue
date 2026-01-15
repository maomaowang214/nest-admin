<template>
  <DynamicTable
    row-key="tokenId"
    header-title="在线用户"
    title-tooltip="这是真实操作，请不要随意将其他用户踢下线。"
    :data-source="list"
    :columns="columns"
    :loading="loading"
    :scroll="{ x: 'max-content' }"
    show-index
    @reload="handleReload"
    @search="handleSearch"
  >
    <template #toolbar>
      <a-switch
        v-model:checked="realTimeUpdate"
        checked-children="开启实时更新"
        un-checked-children="关闭实时更新"
        @change="handleRealTimeUpdateChange"
      />
    </template>
  </DynamicTable>
</template>

<script setup lang="tsx">
  import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
  import { message } from 'ant-design-vue';
  import { baseColumns, type TableListItem } from './columns';
  import type { TableColumn } from '@/components/core/dynamic-table';
  import { useTable } from '@/components/core/dynamic-table';
  import { Api } from '@/api/';
  import { useSSEStore } from '@/store/modules/sse';

  defineOptions({
    name: 'SystemMonitorOnline',
  });

  // 状态管理
  const originList = ref<TableListItem[]>([]);
  const realTimeUpdate = ref(true);
  const list = ref<TableListItem[]>([]);
  const loading = ref(false);
  const sseStore = useSSEStore();
  const [DynamicTable, dynamicTableInstance] = useTable({ size: 'small' });

  // 表格列配置
  const columns: TableColumn<TableListItem>[] = [
    ...baseColumns,
    {
      title: '操作',
      width: 100,
      dataIndex: 'ACTION',
      fixed: 'right',
      actions: ({ record }) => [
        {
          label: '下线',
          auth: 'system:online:kick',
          disabled: record.disable,
          danger: true,
          popConfirm: {
            title: `确定要下线用户 "${record.username}" 吗？`,
            description: '此操作将强制该用户退出登录',
            onConfirm: () => handleKick(record),
          },
        },
      ],
    },
  ];

  /**
   * 踢下线用户
   */
  const handleKick = async (record: TableListItem) => {
    try {
    await Api.systemOnline.onlineKick({ tokenId: record.tokenId });
      message.success(`用户 "${record.username}" 已下线`);
      await handleReload();
    }
    catch (error: any) {
      // axios 拦截器已经显示了错误消息（response 拦截器或 error 拦截器）
      // 这里不需要再次显示，避免重复提示
      // 错误消息已经在 request.ts 的拦截器中处理了
    }
  };

  /**
   * 搜索处理
   */
  const handleSearch = (params: Partial<TableListItem>) => {
    const searchKeys: (keyof TableListItem)[] = ['username', 'deptName', 'ip'];
    const hasSearchValue = searchKeys.some((key) => Boolean(params[key]));

    if (!hasSearchValue) {
      list.value = originList.value;
      return;
    }

    list.value = originList.value.filter((item) => {
      return searchKeys.every((key) => {
        const searchValue = params[key];
        if (!searchValue) {
          return true;
        }
        const itemValue = String(item[key] || '');
        return itemValue.toLowerCase().includes(String(searchValue).toLowerCase());
      });
    });
  };

  /**
   * 重新加载数据
   */
  const handleReload = async () => {
    try {
    loading.value = true;
      const data = await Api.systemOnline.onlineList();
      originList.value = data || [];
      list.value = originList.value;
    }
    catch (error: any) {
      message.error(error?.message || '加载在线用户列表失败');
      originList.value = [];
      list.value = [];
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 实时更新变化处理
   */
  const onOnlineUserChange = () => {
    if (realTimeUpdate.value) {
      handleReload();
    }
  };

  /**
   * 实时更新开关变化处理
   */
  const handleRealTimeUpdateChange = (checked: boolean) => {
    if (checked) {
      handleReload();
    }
  };

  // 监听实时更新开关
  watch(realTimeUpdate, (val) => {
    if (val) {
      handleReload();
    }
  });

  // 生命周期
  onMounted(() => {
    handleReload();
    sseStore.emitter.on('onlineUser', onOnlineUserChange);
  });

  onBeforeUnmount(() => {
    sseStore.emitter.off('onlineUser', onOnlineUserChange);
  });
</script>
