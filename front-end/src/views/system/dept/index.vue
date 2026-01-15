<template>
  <div>
    <DynamicTable
      row-key="id"
      header-title="部门管理"
      :data-request="Api.systemDept.deptList"
      :columns="columns"
      bordered
      size="small"
      show-index
    >
      <template #afterHeaderTitle>
        <div class="flex gap-2 ml-2">
          <a-button @click="dynamicTableInstance.expandAll">展开全部</a-button>
          <a-button @click="dynamicTableInstance.collapseAll">折叠全部</a-button>
        </div>
      </template>
      <template #toolbar>
        <a-button
          type="primary"
          :disabled="!$auth('system:dept:create')"
          @click="openMenuModal({})"
        >
          新增
        </a-button>
      </template>
    </DynamicTable>
  </div>
</template>

<script lang="ts" setup>
  import { message } from 'ant-design-vue';
  import { baseColumns, type TableListItem, type TableColumnItem } from './columns';
  import { roleSchemas } from './formSchemas';
  import { useTable } from '@/components/core/dynamic-table';
  import { useFormModal } from '@/hooks/useModal/';
  import Api from '@/api/';

  defineOptions({
    name: 'SystemDept',
  });

  const [DynamicTable, dynamicTableInstance] = useTable();

  const [showModal] = useFormModal();

  /**
   * @description 打开新增/编辑弹窗
   */
  const openMenuModal = async (record: Partial<TableListItem>) => {
    const [formRef] = await showModal({
      modalProps: {
        title: `${record.id ? '编辑' : '新增'}部门`,
        width: '50%',
        onFinish: async (values) => {
          try {
            if (record.id) {
              await Api.systemDept.deptUpdate({ id: record.id }, values);
            }
            else {
              await Api.systemDept.deptCreate(values);
            }
            message.success(`${record.id ? '更新' : '创建'}成功`);
            dynamicTableInstance?.reload();
            return true;
          }
          catch (error: any) {
            message.error(error?.message || `${record.id ? '更新' : '创建'}失败`);
            return false;
          }
        },
      },
      formProps: {
        labelWidth: 100,
        schemas: roleSchemas,
      },
    });
    formRef?.setFieldsValue({
      ...record,
      parentId: record.parent?.id,
    });
  };
  const delRowConfirm = async (record: TableListItem) => {
    try {
      await Api.systemDept.deptDelete({ id: record.id });
      message.success('删除成功');
      dynamicTableInstance?.reload();
    }
    catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  const columns: TableColumnItem[] = [
    ...baseColumns,
    {
      title: '操作',
      width: 130,
      dataIndex: 'ACTION',
      hideInSearch: true,
      fixed: 'right',
      actions: ({ record }) => [
        {
          label: '编辑',
          auth: {
            perm: 'system:dept:update',
            effect: 'disable',
          },
          onClick: () => openMenuModal(record),
        },
        {
          label: '删除',
          auth: 'system:dept:delete',
          popConfirm: {
            title: '你确定要删除吗？',
            placement: 'left',
            onConfirm: () => delRowConfirm(record),
          },
        },
      ],
    },
  ];
</script>
