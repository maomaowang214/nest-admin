---
name: 通用代码模式
description: 前后端通用代码模式和最佳实践
---

# 通用代码模式

## 错误处理模式

### 后端模式
```typescript
async findUserById(id: string): Promise<UserEntity> {
  const user = await this.userRepository.findOneBy({ id })
  if (isEmpty(user)) {
    throw new BusinessException(ErrorEnum.USER_NOT_FOUND)
  }
  return user
}
```

### 前端模式
```typescript
const handleAction = async () => {
  try {
    await Api.module.action(params)
    message.success('操作成功')
  }
  catch (error: any) {
    message.error(error?.message || '操作失败')
  }
}
```

## CRUD 操作模式

### 后端完整 CRUD
```typescript
@Controller('users')
export class UserController {
  @Get()
  async list(@Query() dto: QueryDto) {
    return this.service.list(dto)
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    return this.service.info(id)
  }

  @Post()
  async create(@Body() dto: CreateDto) {
    return this.service.create(dto)
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id)
  }
}
```

### 前端表格操作
```typescript
const [DynamicTable, dynamicTableInstance] = useTable()
const [showModal] = useFormModal()

// 创建
const handleCreate = async () => {
  const [formRef] = await showModal({
    modalProps: {
      title: '新增',
      onFinish: async (values) => {
        try {
          await Api.module.create(values)
          message.success('创建成功')
          dynamicTableInstance?.reload()
          return true
        }
        catch (error: any) {
          message.error(error?.message || '创建失败')
          return false
        }
      },
    },
    formProps: {
      schemas: formSchemas,
    },
  })
}

// 更新
const handleUpdate = async (record: TableListItem) => {
  const [formRef] = await showModal({
    modalProps: {
      title: '编辑',
      onFinish: async (values) => {
        try {
          await Api.module.update({ id: record.id }, values)
          message.success('更新成功')
          dynamicTableInstance?.reload()
          return true
        }
        catch (error: any) {
          message.error(error?.message || '更新失败')
          return false
        }
      },
    },
    formProps: {
      schemas: formSchemas,
      initialValues: record,
    },
  })
}

// 删除
const handleDelete = async (id: string) => {
  try {
    await Api.module.delete({ id })
    message.success('删除成功')
    dynamicTableInstance?.reload()
  }
  catch (error: any) {
    message.error(error?.message || '删除失败')
  }
}
```

## 表单验证模式

### 后端 DTO 验证
```typescript
export class UserCreateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  username: string

  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  phone?: string
}
```

### 前端表单配置
```typescript
export const userSchemas: FormSchema<API.UserCreateDto>[] = [
  {
    field: 'username',
    component: 'Input',
    label: '用户名',
    rules: [
      { required: true, message: '请输入用户名' },
      { min: 3, max: 20, message: '用户名长度为3-20位' },
    ],
  },
  {
    field: 'email',
    component: 'Input',
    label: '邮箱',
    rules: [
      { type: 'email', message: '请输入有效的邮箱地址' },
    ],
  },
]
```

## API 调用模式

### 统一格式
```typescript
// 成功响应
{
  code: 200,
  message: 'success',
  data: { ... }
}

// 错误响应
{
  code: 400,
  message: '错误信息',
  data: null
}
```

### 前端调用
```typescript
// GET 请求
const data = await Api.module.list(params)

// POST 请求
await Api.module.create(data)

// PUT 请求
await Api.module.update({ id }, data)

// DELETE 请求
await Api.module.delete({ id })
```

## 权限控制模式

### 后端权限
```typescript
export const permissions = definePermission('system:user', {
  LIST: 'list',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const)

@Perm(permissions.CREATE)
@Post()
async create(@Body() dto: CreateDto) {
  return this.service.create(dto)
}
```

### 前端权限
```vue
<a-button
  :disabled="!$auth('system:user:create')"
  @click="handleCreate"
>
  新增
</a-button>
```

## 代码审查检查点

- [ ] 错误处理是否完整
- [ ] 类型定义是否明确
- [ ] 命名是否符合规范
- [ ] 代码是否超过 500 行
- [ ] 是否移除了调试代码
- [ ] 是否遵循项目结构规范
