# Cursor 编码规范规则

本目录包含项目的编码规范规则，供 Cursor AI 助手在编码时参考和应用。

## 📁 目录结构

```
.cursor/
├── skills/
│   └── all/
│       └── SKILL.md              # 综合编码规范（主要规则）
└── rules/
    ├── coding-standards.md       # 核心编码规范
    ├── backend-standards.md     # 后端编码规范
    ├── frontend-standards.md    # 前端编码规范
    └── common-patterns.md        # 通用代码模式
```

## 📚 规则文件说明

### 1. `skills/all/SKILL.md` - 综合编码规范
**主要规则文件**，包含：
- 核心设计原则
- 命名规范
- 代码风格规范
- 错误处理规范
- 重要提醒（如 Vue 3 不支持 React API）

**使用场景**: 所有编码任务的主要参考

### 2. `rules/coding-standards.md` - 核心编码规范
**核心规则速查**，包含：
- 基本原则
- 命名规范速查表
- 重要提醒
- 代码模板

**使用场景**: 快速查阅核心规范

### 3. `rules/backend-standards.md` - 后端编码规范
**NestJS 后端专用规范**，包含：
- 后端项目结构
- Controller/Service 规范
- 错误处理模式
- DTO 验证规范

**使用场景**: 后端开发任务

### 4. `rules/frontend-standards.md` - 前端编码规范
**Vue 3 前端专用规范**，包含：
- 前端项目结构
- Vue 组件规范
- 组合式 API 使用
- 性能优化

**使用场景**: 前端开发任务

### 5. `rules/common-patterns.md` - 通用代码模式
**通用代码模式**，包含：
- CRUD 操作模式
- 错误处理模式
- 表单验证模式
- API 调用模式

**使用场景**: 通用代码模式参考

## 🎯 如何使用

### 在 Cursor 中应用规则

1. **自动应用**: Cursor 会自动读取 `.cursor/skills/all/SKILL.md` 中的规则
2. **手动引用**: 在对话中可以使用 `@all` 来引用所有规则
3. **特定规则**: 可以引用特定规则文件，如 `@backend-standards` 或 `@frontend-standards`

### 规则优先级

1. **skills/all/SKILL.md** - 最高优先级，综合规范
2. **rules/** - 特定场景的详细规范

## 📋 规则内容概览

### 核心原则
- DRY (不重复)
- KISS (保持简单)
- SOLID 原则
- YAGNI (不过度设计)

### 代码质量要求
- 单文件 ≤ 500 行
- 函数参数 ≤ 5 个
- 嵌套层级 ≤ 4 层
- 圈复杂度 ≤ 10

### 重要提醒
- ❌ Vue 3 不支持 `useMemo` (React API)
- ✅ 使用 `computed` 创建计算属性
- ✅ 所有异步操作必须错误处理
- ✅ 避免使用 `any` 类型

## 🔄 更新规则

当需要更新编码规范时：
1. 更新对应的规则文件
2. 确保规则文件格式正确（YAML front matter）
3. 测试规则是否生效

## 💡 提示

- 规则文件使用 Markdown 格式
- 使用 YAML front matter 定义元数据
- 规则应该简洁明了，便于 AI 理解
- 定期审查和更新规则

---

**注意**: 这些规则会指导 Cursor AI 助手在编码时遵循项目规范，确保代码质量和一致性。
