<template>
  <DynamicTable header-title="菜单管理" :data-request="Api.systemMenu.menuList" :columns="columns" show-index>
    <template #afterHeaderTitle>
      <div class="flex gap-2 ml-2">
        <a-button @click="dynamicTableInstance.expandAll">展开全部</a-button>
        <a-button @click="dynamicTableInstance.collapseAll">折叠全部</a-button>
      </div>
    </template>
    <template #toolbar>
      <a-button type="primary" :disabled="!$auth('system:menu:create')" @click="openMenuModal({})">
        新增
      </a-button>
    </template>
  </DynamicTable>
</template>

<script lang="tsx" setup>
  import { getCurrentInstance } from 'vue';
  import { useResizeObserver } from '@vueuse/core';
  import { message } from 'ant-design-vue';
  import { baseColumns, type TableListItem, type TableColumnItem } from './columns';
  import { useMenuSchemas } from './formSchemas';
  import Api from '@/api/';
  import { useTable } from '@/components/core/dynamic-table';
  import { useFormModal } from '@/hooks/useModal/';

  defineOptions({
    name: 'SysMenu',
  });
  const [DynamicTable, dynamicTableInstance] = useTable({
    pagination: false,
    size: 'small',
    rowKey: 'id',
    bordered: true,
    autoHeight: true,
  });
  const [showModal] = useFormModal();
  const currentInstance = getCurrentInstance();

  useResizeObserver(document.documentElement, () => {
    const el = currentInstance?.proxy?.$el as HTMLDivElement;
    if (el) {
      dynamicTableInstance.setProps({
        scroll: { x: window.innerWidth > 2000 ? el.offsetWidth - 20 : 2000 },
      });
    }
  });

  const openMenuModal = async (record: Partial<TableListItem>) => {
    const [formRef] = await showModal({
      modalProps: {
        title: `${record.id ? '编辑' : '新增'}菜单`,
        width: 700,
        onFinish: async (values) => {
          try {
            record.id && (values.menuId = record.id);
            if (Array.isArray(values.component)) {
              values.component = values.component.join('/');
            }
            if (Array.isArray(values.permission)) {
              values.permission = values.permission.join(':');
            }
            if (values.parentId === -1) {
              Reflect.deleteProperty(values, 'parentId');
            }
            if (record.id) {
              await Api.systemMenu.menuUpdate({ id: record.id }, values);
            }
            else {
              await Api.systemMenu.menuCreate(values);
            }
            message.success(`${record.id ? '更新' : '创建'}成功`);
            dynamicTableInstance.reload();
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
        schemas: useMenuSchemas(),
      },
    });

    formRef?.setFieldsValue({
      ...record,
      icon: record.icon ?? '',
      parentId: record.parentId ?? -1,
      component: record.component?.split('/'),
    });
  };
  const delRowConfirm = async (record: TableListItem) => {
    try {
      await Api.systemMenu.menuDelete({ id: record.id });
      message.success('删除成功');
      dynamicTableInstance.reload();
    }
    catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  const columns: TableColumnItem[] = [
    ...baseColumns,
    {
      title: '操作',
      width: 160,
      dataIndex: 'ACTION',
      hideInSearch: true,
      fixed: 'right',
      actions: ({ record }) => [
        {
          label: '编辑',
          auth: {
            perm: 'system:menu:update',
            effect: 'disable',
          },
          onClick: () => openMenuModal(record),
        },
        {
          label: '新增',
          auth: {
            perm: 'system:menu:create',
            effect: 'disable',
          },
          disabled: record.type === 2 || record.status === 0,
          onClick: () => openMenuModal({ parentId: record.id }),
        },
        {
          label: '删除',
          auth: 'system:menu:delete',
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
