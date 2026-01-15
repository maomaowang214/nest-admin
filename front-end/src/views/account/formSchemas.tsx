import type { FormSchema } from '@/components/core/schema-form';

/**
 * 个人信息表单配置
 */
export const getProfileSchemas = (): FormSchema<API.AccountUpdateDto>[] => {
  return [
    {
      field: 'nickname',
      component: 'Input',
      label: '昵称',
      componentProps: {
        placeholder: '请输入昵称',
      },
    },
    {
      field: 'email',
      component: 'Input',
      label: '邮箱',
      componentProps: {
        placeholder: '请输入邮箱地址',
      },
      rules: [
        {
          type: 'email',
          message: '请输入有效的邮箱地址',
        },
      ],
    },
    {
      field: 'phone',
      component: 'Input',
      label: '手机号',
      componentProps: {
        placeholder: '请输入手机号',
      },
    },
    {
      field: 'qq',
      component: 'Input',
      label: 'QQ',
      componentProps: {
        placeholder: '请输入QQ号（5-11位数字）',
      },
      rules: [
        {
          pattern: /^\d{5,11}$/,
          message: 'QQ号必须是5-11位数字',
        },
      ],
    },
    {
      field: 'avatar',
      component: 'Input',
      label: '头像URL',
      componentProps: {
        placeholder: '请输入头像图片URL',
      },
    },
    {
      field: 'remark',
      component: 'InputTextArea',
      label: '备注',
      componentProps: {
        placeholder: '请输入备注信息',
        rows: 4,
      },
    },
  ];
};

/**
 * 密码修改表单配置
 */
export const getPasswordSchemas = (): FormSchema<API.PasswordUpdateDto & { confirmPassword?: string }>[] => {
  return [
    {
      field: 'oldPassword',
      component: 'InputPassword',
      label: '旧密码',
      componentProps: {
        placeholder: '请输入当前密码',
      },
      rules: [
        {
          required: true,
          message: '请输入旧密码',
        },
        {
          min: 6,
          max: 20,
          message: '密码长度为6-20位',
        },
      ],
    },
    {
      field: 'newPassword',
      component: 'InputPassword',
      label: '新密码',
      componentProps: {
        placeholder: '请输入新密码（6-16位，包含数字和字母）',
      },
      rules: [
        {
          required: true,
          message: '请输入新密码',
        },
        {
          pattern: /^\S*(?=\S{6})(?=\S*\d)(?=\S*[A-Z])\S*$/i,
          message: '密码必须包含数字和字母，长度6-16位',
        },
      ],
    },
    {
      field: 'confirmPassword',
      component: 'InputPassword',
      label: '确认新密码',
      componentProps: {
        placeholder: '请再次输入新密码',
      },
      rules: [
        {
          required: true,
          message: '请确认新密码',
        },
      ],
    },
  ];
};
