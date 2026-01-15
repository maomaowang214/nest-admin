---
name: 项目编码规范
description: 前后端项目编码标准，确保代码质量、可维护性和团队协作效率
---

# 项目编码规范

## 核心设计原则

遵循以下设计原则：
- **DRY (Don't Repeat Yourself)**: 避免代码重复，提取公共逻辑
- **KISS (Keep It Simple, Stupid)**: 保持简单，避免过度设计
- **SOLID 原则**: 单一职责、开闭原则、里氏替换、接口隔离、依赖倒置
- **YAGNI (You Aren't Gonna Need It)**: 不要过度设计，只实现当前需要的功能

## 代码质量要求

- ✅ 单个类、函数或文件不超过 **500 行**，超过需拆分
- ✅ 函数参数不超过 **5 个**，超过使用对象参数
- ✅ 嵌套层级不超过 **4 层**
- ✅ 圈复杂度不超过 **10**

## 命名规范

### 后端 (NestJS)
- **类**: PascalCase - `UserController`, `UserService`
- **文件**: kebab-case - `user.controller.ts`, `user.service.ts`
- **变量/函数**: camelCase - `userName`, `getUserList()`
- **常量**: UPPER_SNAKE_CASE - `MAX_RETRY_COUNT`, `API_BASE_URL`
- **接口/类型**: PascalCase - `UserInfo`, `IUserInfo` (可选)

### 前端 (Vue 3)
- **组件名**: PascalCase - `UserManagement`, `FileUpload`
- **文件**: kebab-case 或 PascalCase - `user-management.vue`
- **变量/函数**: camelCase - `userName`, `getUserList()`
- **常量**: UPPER_SNAKE_CASE - `API_BASE_URL`
- **组合式函数**: use + camelCase - `useTableActions()`, `useFormModal()`
- **类型/接口**: PascalCase - `UserInfo`, `TableListItem`

## 代码风格规范

### 后端代码风格

#### 导入顺序
```typescript
// 1. NestJS 核心模块
import { Controller, Get, Post, Body } from '@nestjs/common'

// 2. 第三方库
import { isEmpty } from 'lodash'
import Redis from 'ioredis'

// 3. 项目内部模块（使用 ~ 别名）
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { UserService } from './user.service'
```

#### 类结构
```typescript
@Injectable()
export class UserService {
  // 1. 构造函数
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  // 2. 公共方法
  async findUserById(id: string): Promise<UserEntity> {}

  // 3. 私有方法
  private validateUser(user: UserEntity): boolean {}
}
```

#### 错误处理
```typescript
// ✅ 正确 - 使用业务异常
import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'

if (isEmpty(user)) {
  throw new BusinessException(ErrorEnum.USER_NOT_FOUND)
}

// ❌ 错误 - 不要使用通用 Error
if (isEmpty(user)) {
  throw new Error('User not found')
}
```

### 前端代码风格

#### Vue 组件结构
```vue
<template>
  <!-- 模板内容 -->
</template>

<script lang="ts" setup>
  // 1. 导入
  import { ref, computed, onMounted } from 'vue'
  import { message } from 'ant-design-vue'
  
  // 2. 类型定义
  interface UserInfo {
    id: number
    name: string
  }
  
  // 3. 组件选项
  defineOptions({
    name: 'UserManagement',
  })
  
  // 4. 响应式数据
  const loading = ref(false)
  const userList = ref<UserInfo[]>([])
  
  // 5. 计算属性
  const filteredList = computed(() => {
    return userList.value.filter(u => u.status === 'active')
  })
  
  // 6. 方法
  const loadData = async () => {}
  
  // 7. 生命周期
  onMounted(() => {
    loadData()
  })
</script>
```

#### 导入顺序
```typescript
// 1. Vue 核心
import { ref, computed, onMounted } from 'vue'

// 2. Vue Router
import { useRoute, useRouter } from 'vue-router'

// 3. 第三方库
import { message, Modal } from 'ant-design-vue'
import { isEmpty } from 'lodash-es'

// 4. 项目内部（使用 @ 别名）
import Api from '@/api/'
import { useTable } from '@/components/core/dynamic-table'

// 5. 相对路径
import { userSchemas } from './formSchemas'
```

#### 重要提醒
- ❌ **Vue 3 不支持 `useMemo`**（这是 React 的 API）
- ✅ 使用 `computed` 创建计算属性
- ✅ 表单配置直接使用，不需要缓存（静态配置）

```typescript
// ❌ 错误
import { useMemo } from 'vue'
const schemas = useMemo(() => getSchemas(), [])

// ✅ 正确
import { computed } from 'vue'
const schemas = computed(() => getSchemas())

// ✅ 或者直接使用（静态配置）
const schemas = userSchemas
```

## 错误处理规范

### 后端错误处理
```typescript
// ✅ 正确
import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'

async findUserById(id: string): Promise<UserEntity> {
  const user = await this.userRepository.findOneBy({ id })
  if (isEmpty(user)) {
    throw new BusinessException(ErrorEnum.USER_NOT_FOUND)
  }
  return user
}
```

### 前端错误处理
```typescript
// ✅ 正确 - 统一错误处理
try {
  await Api.systemUser.userCreate(data)
  message.success('创建成功')
}
catch (error: any) {
  message.error(error?.message || '创建失败')
}
```

## 前后端交互规范

### API 设计
- ✅ 使用 RESTful API 设计
- ✅ 使用 DTO 进行参数验证
- ✅ 统一响应格式
- ✅ 使用正确的 HTTP 状态码

### 请求/响应格式
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
  message: '参数错误',
  data: null
}
```

## 性能优化规范

### 后端优化
- ✅ 使用查询构建器，只查询需要的字段
- ✅ 使用分页工具 `paginate()`
- ✅ 合理使用缓存（Redis）
- ✅ 避免 N+1 查询问题

### 前端优化
- ✅ 路由懒加载
- ✅ 使用 `computed` 缓存计算结果
- ✅ 避免不必要的响应式包装
- ✅ 列表渲染使用 `key`

## 安全规范

### 后端安全
- ✅ 使用 `class-validator` 验证参数
- ✅ 使用权限装饰器 `@Perm()` 控制访问
- ✅ 使用参数化查询防止 SQL 注入

### 前端安全
- ✅ 避免使用 `v-html`（除非必要且已过滤）
- ✅ 不在前端存储敏感信息
- ✅ 使用 HTTPS 传输数据

## 代码审查清单

提交代码前检查：
- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 TypeScript 类型检查
- [ ] 移除所有 `console.log` 调试代码
- [ ] 添加必要的错误处理
- [ ] 添加必要的类型定义
- [ ] 单个文件不超过 500 行
- [ ] 函数参数不超过 5 个
- [ ] 遵循命名规范
- [ ] 添加必要的注释

## 常见错误避免

### ❌ 错误示例
```typescript
// 1. 使用 React API（Vue 3 不支持）
import { useMemo, useState } from 'vue' // ❌

// 2. 不处理错误
const data = await Api.getData() // ❌

// 3. 使用 any 类型
const user: any = {} // ❌

// 4. 不验证参数
async create(dto: CreateDto) {
  // 直接使用，不验证 // ❌
}
```

### ✅ 正确示例
```typescript
// 1. 使用 Vue 3 API
import { computed, ref } from 'vue' // ✅

// 2. 处理错误
try {
  const data = await Api.getData()
}
catch (error: any) {
  message.error(error?.message || '操作失败')
}

// 3. 明确类型
interface UserInfo {
  id: number
  name: string
}
const user: UserInfo = {} // ✅

// 4. 验证参数
export class CreateDto {
  @IsString()
  @IsNotEmpty()
  name: string
}
```

## 项目结构规范

### 后端模块结构
```
{module}/
├── {module}.controller.ts
├── {module}.service.ts
├── {module}.entity.ts
├── {module}.module.ts
├── dto/
│   └── {module}.dto.ts
└── constant.ts
```

### 前端页面结构
```
{module}/
├── index.vue
├── columns.tsx
├── formSchemas.tsx
└── components/
```

## 代码模板

### 后端 Controller 模板
```typescript
@ApiTags('{Module} - {模块名称}')
@ApiSecurityAuth()
@Controller('{modules}')
export class {Module}Controller {
  constructor(
    private readonly {module}Service: {Module}Service,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取列表' })
  @ApiResult({ type: [{Module}Entity], isPage: true })
  @Perm(permissions.LIST)
  async list(@Query() dto: QueryDto) {
    return this.{module}Service.list(dto)
  }
}
```

### 前端 Vue 组件模板
```vue
<script lang="ts" setup>
  import { ref } from 'vue';
  import { message } from 'ant-design-vue';
  import { useTable } from '@/components/core/dynamic-table';
  import { useFormModal } from '@/hooks/useModal/';
  import Api from '@/api/';

  defineOptions({
    name: '{Module}Management',
  });

  const [DynamicTable, dynamicTableInstance] = useTable();
  const [showModal] = useFormModal();

  const handleCreate = async () => {
    const [formRef] = await showModal({
      modalProps: {
        title: '新增',
        onFinish: async (values) => {
          try {
            await Api.{module}.{module}Create(values);
            message.success('创建成功');
            dynamicTableInstance?.reload();
            return true;
          }
          catch (error: any) {
            message.error(error?.message || '创建失败');
            return false;
          }
        },
      },
      formProps: {
        schemas: {module}Schemas,
      },
    });
  };
</script>
```

## 重要提醒

1. **Vue 3 不支持 React API**: 不要使用 `useMemo`, `useState` 等 React API
2. **错误处理**: 所有异步操作必须添加 try-catch
3. **类型安全**: 避免使用 `any`，使用明确的类型定义
4. **代码拆分**: 超过 500 行的文件需要拆分
5. **遵循规范**: 严格按照命名规范和代码风格编写代码
