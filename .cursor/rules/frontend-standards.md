---
name: 前端编码规范
description: Vue 3 + TypeScript 前端编码规范和最佳实践
---

# 前端编码规范 (Vue 3)

## 项目结构

```
views/{module}/
├── index.vue           # 主页面
├── columns.tsx         # 表格列定义
├── formSchemas.tsx     # 表单配置
└── components/         # 页面级组件
```

## 命名规范

- **组件名**: PascalCase - `UserManagement`
- **文件**: kebab-case - `user-management.vue`
- **变量/函数**: camelCase - `userName`, `getUserList()`
- **组合式函数**: `use + camelCase` - `useTableActions()`
- **类型/接口**: PascalCase - `UserInfo`, `TableListItem`

## Vue 组件结构

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

## 导入顺序

```typescript
// 1. Vue 核心
import { ref, computed } from 'vue'

// 2. Vue Router
import { useRoute, useRouter } from 'vue-router'

// 3. 第三方库
import { message, Modal } from 'ant-design-vue'
import { isEmpty } from 'lodash-es'

// 4. 项目内部（@ 别名）
import Api from '@/api/'
import { useTable } from '@/components/core/dynamic-table'

// 5. 相对路径
import { userSchemas } from './formSchemas'
```

## ⚠️ 重要：Vue 3 不支持 React API

```typescript
// ❌ 错误 - Vue 3 不支持 useMemo
import { useMemo } from 'vue'
const schemas = useMemo(() => getSchemas(), [])

// ✅ 正确 - 使用 computed
import { computed } from 'vue'
const schemas = computed(() => getSchemas())

// ✅ 或者直接使用（静态配置）
const schemas = userSchemas
```

## 错误处理

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

## 表单处理

```typescript
const [showModal] = useFormModal()

const handleCreate = async () => {
  const [formRef] = await showModal({
    modalProps: {
      title: '新增用户',
      width: 700,
      onFinish: async (values) => {
        try {
          await Api.systemUser.userCreate(values)
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
      labelWidth: 100,
      schemas: userSchemas, // 直接使用，不需要 computed
    },
  })
}
```

## 类型定义

```typescript
// ✅ 正确 - 明确的类型
interface UserInfo {
  id: number
  name: string
  email?: string
}

const userList = ref<UserInfo[]>([])
const selectedUser = ref<UserInfo | null>(null)

// ❌ 错误 - 使用 any
const userList = ref<any[]>([])
```

## 性能优化

```typescript
// ✅ 路由懒加载
const routes = [
  {
    path: '/users',
    component: () => import('@/views/system/user/index.vue'),
  },
]

// ✅ 使用 computed 缓存
const filteredList = computed(() => {
  return userList.value.filter(u => u.status === 'active')
})

// ✅ 避免不必要的响应式
const MAX_COUNT = 10 // 常量不需要响应式
```

## 代码质量

- ✅ 移除所有 `console.log` 调试代码
- ✅ 添加必要的错误处理
- ✅ 使用明确的类型定义
- ✅ 单个文件不超过 500 行
