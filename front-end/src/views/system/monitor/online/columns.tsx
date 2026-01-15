import { Tag } from 'ant-design-vue';
import type { TableColumn } from '@/components/core/dynamic-table';
import { formatToDateTime } from '@/utils/dateUtil';

export type TableListItem = API.OnlineUserInfo;

/**
 * 在线用户表格列配置
 */
export const baseColumns: TableColumn<TableListItem>[] = [
  {
    title: '会话编号',
    dataIndex: 'tokenId',
    width: 200,
    ellipsis: true,
    hideInSearch: true,
    customRender: ({ record }) => (
      <span class="font-mono text-xs">{record.tokenId}</span>
    ),
  },
  {
    title: '用户名',
    dataIndex: 'username',
    width: 120,
    customRender: ({ record }) => (
      <div class="flex items-center gap-2">
        <span>{record.username}</span>
        {record.isCurrent && (
          <Tag color="processing" size="small">
            我
          </Tag>
        )}
      </div>
    ),
  },
  {
    title: '部门名称',
    dataIndex: 'deptName',
    width: 120,
    ellipsis: true,
  },
  {
    title: '登录IP',
    dataIndex: 'ip',
    width: 140,
    customRender: ({ record }) => (
      <span class="font-mono">{record.ip}</span>
    ),
  },
  {
    title: '登录地点',
    dataIndex: 'address',
    width: 150,
    ellipsis: true,
  },
  {
    title: '浏览器',
    dataIndex: 'browser',
    width: 150,
    ellipsis: true,
  },
  {
    title: '操作系统',
    dataIndex: 'os',
    width: 150,
    ellipsis: true,
  },
  {
    title: '登录时间',
    dataIndex: 'time',
    width: 180,
    sorter: true,
    customRender: ({ record }) => (
      <span>{formatToDateTime(record.time)}</span>
    ),
  },
];
