---
name: 编码规范规则
description: 项目编码规范的核心规则，用于指导 AI 助手编写代码
---

# 编码规范核心规则

## 🎯 核心原则

1. **DRY**: 避免代码重复，提取公共逻辑
2. **KISS**: 保持简单，避免过度设计
3. **SOLID**: 遵循面向对象设计原则
4. **YAGNI**: 不过度设计，只实现当前需要的功能

## 📏 代码质量要求

- 单个文件 ≤ 500 行
- 函数参数 ≤ 5 个
- 嵌套层级 ≤ 4 层
- 圈复杂度 ≤ 10

## 🔤 命名规范速查

### 后端
- 类: `PascalCase` (UserController)
- 文件: `kebab-case` (user.controller.ts)
- 变量: `camelCase` (userName)
- 常量: `UPPER_SNAKE_CASE` (MAX_COUNT)

### 前端
- 组件: `PascalCase` (UserManagement)
- 文件: `kebab-case` (user-management.vue)
- 变量: `camelCase` (userName)
- 组合式函数: `use + camelCase` (useTableActions)

## ⚠️ 重要提醒

### Vue 3 不支持 React API
- ❌ 不要使用 `useMemo` (React API)
- ✅ 使用 `computed` 创建计算属性
- ✅ 静态配置直接使用，不需要缓存

### 错误处理
- ✅ 所有异步操作必须使用 try-catch
- ✅ 后端使用 `BusinessException` 和 `ErrorEnum`
- ✅ 前端使用 `message.error` 统一提示

### 类型安全
- ❌ 避免使用 `any`
- ✅ 使用明确的接口和类型定义

## 📝 代码模板

### 后端 Controller
```typescript
@ApiTags('Module - 模块名称')
@ApiSecurityAuth()
@Controller('modules')
export class ModuleController {
  @Get()
  @ApiOperation({ summary: '获取列表' })
  @Perm(permissions.LIST)
  async list(@Query() dto: QueryDto) {
    return this.moduleService.list(dto)
  }
}
```

### 前端 Vue 组件
```vue
<script lang="ts" setup>
  import { ref } from 'vue';
  import { message } from 'ant-design-vue';
  
  defineOptions({ name: 'ModuleManagement' });
  
  const handleAction = async () => {
    try {
      await Api.module.action();
      message.success('操作成功');
    }
    catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };
</script>
```
