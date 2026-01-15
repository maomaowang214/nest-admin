<template>
  <div id="auto-height" class="login-log-container">
    <DynamicTable
      header-title="登录日志"
      title-tooltip="记录所有用户的登录历史记录，包括登录IP、地点、时间等信息"
      auto-height="#auto-height"
      :data-request="handleDataRequest"
      :columns="columns"
      :scroll="{ x: 'max-content' }"
      show-index
    />
  </div>
</template>

<script setup lang="tsx">
import { ref } from 'vue';
import type { TableColumn } from '@/components/core/dynamic-table';
import { useTable } from '@/components/core/dynamic-table';
import { Api } from '@/api/';
import { baseColumns, type TableListItem } from './columns';

defineOptions({
  name: 'SystemMonitorLoginLog',
});

const [DynamicTable] = useTable();

/**
 * 表格列配置
 */
const columns: TableColumn<TableListItem>[] = baseColumns;

/**
 * 数据请求处理函数
 */
const handleDataRequest = async (params: any) => {
  try {
    const response = await Api.systemLog.logLoginLogPage(params);
    return response;
  }
  catch (error: any) {
    console.error('获取登录日志失败:', error);
    throw error;
  }
};
</script>

<style lang="less" scoped>
.login-log-container {
  height: 80%;
  padding: 16px;
}
</style>
