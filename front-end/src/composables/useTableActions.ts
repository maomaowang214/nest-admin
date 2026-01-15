/**
 * 表格操作通用组合式函数
 * 提供统一的增删改查操作逻辑
 */
import { ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import type { DynamicTableInstance } from '@/components/core/dynamic-table';

export interface UseTableActionsOptions<T = any> {
  /** 创建API函数 */
  createApi?: (data: T) => Promise<any>;
  /** 更新API函数 */
  updateApi?: (id: string | number, data: T) => Promise<any>;
  /** 删除API函数 */
  deleteApi?: (id: string | number | string[]) => Promise<any>;
  /** 表格实例 */
  tableInstance?: DynamicTableInstance;
  /** 成功提示消息 */
  successMessage?: string;
  /** 错误提示消息 */
  errorMessage?: string;
}

/**
 * 表格操作组合式函数
 */
export function useTableActions<T = any>(options: UseTableActionsOptions<T>) {
  const {
    createApi,
    updateApi,
    deleteApi,
    tableInstance,
    successMessage = '操作成功',
    errorMessage = '操作失败',
  } = options;

  const loading = ref(false);

  /**
   * 创建记录
   */
  const handleCreate = async (data: T) => {
    if (!createApi) return;
    try {
      loading.value = true;
      await createApi(data);
      message.success(successMessage);
      tableInstance?.reload();
      return true;
    }
    catch (error: any) {
      message.error(error?.message || errorMessage);
      return false;
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 更新记录
   */
  const handleUpdate = async (id: string | number, data: T) => {
    if (!updateApi) return;
    try {
      loading.value = true;
      await updateApi(id, data);
      message.success(successMessage);
      tableInstance?.reload();
      return true;
    }
    catch (error: any) {
      message.error(error?.message || errorMessage);
      return false;
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 删除记录（单个或批量）
   */
  const handleDelete = async (id: string | number | string[], options?: {
    title?: string;
    content?: string;
    skipConfirm?: boolean;
  }) => {
    if (!deleteApi) return;

    const { title = '确定要删除吗？', content = '此操作不可恢复，请谨慎操作', skipConfirm = false } = options || {};

    const executeDelete = async () => {
      try {
        loading.value = true;
        await deleteApi(id);
        message.success(successMessage);
        tableInstance?.reload();
        return true;
      }
      catch (error: any) {
        message.error(error?.message || errorMessage);
        return false;
      }
      finally {
        loading.value = false;
      }
    };

    if (skipConfirm) {
      return executeDelete();
    }

    if (Array.isArray(id)) {
      Modal.confirm({
        title: title || '确定要删除所选记录吗?',
        content,
        icon: <ExclamationCircleOutlined />,
        centered: true,
        okType: 'danger',
        onOk: executeDelete,
      });
    }
    else {
      Modal.confirm({
        title,
        content,
        icon: <ExclamationCircleOutlined />,
        centered: true,
        okType: 'danger',
        onOk: executeDelete,
      });
    }
  };

  return {
    loading,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
