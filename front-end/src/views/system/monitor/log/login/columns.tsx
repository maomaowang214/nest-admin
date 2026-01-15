import { Tag } from 'ant-design-vue';
import type { TableColumn } from '@/components/core/dynamic-table';
import { formatToDateTime } from '@/utils/dateUtil';
import dayjs from 'dayjs';

export type TableListItem = API.LoginLogInfo;

/**
 * 登录日志表格列配置
 */
export const baseColumns: TableColumn<TableListItem>[] = [
  {
    title: '用户名',
    dataIndex: 'username',
    width: 120,
    ellipsis: true,
  },
  {
    title: '登录IP',
    dataIndex: 'ip',
    width: 140,
    customRender: ({ record }) => (
      <Tag color="blue" class="font-mono">
        {record.ip}
      </Tag>
    ),
  },
  {
    title: '登录地点',
    dataIndex: 'address',
    width: 150,
    ellipsis: true,
    customRender: ({ record }) => (
      <span>{record.address || '未知'}</span>
    ),
  },
  {
    title: '登录时间',
    dataIndex: 'time',
    width: 180,
    sorter: true,
    customRender: ({ record }) => (
      <span>{formatToDateTime(record.time)}</span>
    ),
    formItemProps: {
      component: 'RangePicker',
      componentProps: {
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
      },
      transform([startDate, endDate] = []) {
        if (startDate && endDate) {
          return [
            dayjs(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
            dayjs(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss'),
          ];
        }
        return undefined;
      },
    },
  },
  {
    title: '操作系统',
    dataIndex: 'os',
    width: 150,
    ellipsis: true,
    hideInSearch: true,
  },
  {
    title: '浏览器',
    dataIndex: 'browser',
    width: 150,
    ellipsis: true,
    hideInSearch: true,
  },
];
