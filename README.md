# Nest Admin - 全栈权限管理系统

基于 NestJS + TypeScript + TypeORM + Redis + MySQL + Vue3 + Ant Design Vue 编写的一款简单高效的前后端分离的权限管理系统。

## 项目结构

```
nest-root/
├── back-end/          # NestJS 后端项目
│   ├── src/          # 源代码
│   ├── deploy/       # 部署相关文件
│   └── scripts/      # 脚本文件
├── front-end/        # Vue3 前端项目
│   ├── src/          # 源代码
│   └── public/       # 静态资源
└── .cursor/          # Cursor AI 编码规范
```

## 技术栈

### 后端
- **框架**: NestJS
- **语言**: TypeScript
- **ORM**: TypeORM
- **数据库**: MySQL 8.0
- **缓存**: Redis
- **认证**: JWT
- **文档**: Swagger

### 前端
- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **UI 组件库**: Ant Design Vue
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- MySQL >= 8.0
- Redis >= 7.0

### 后端启动

```bash
cd back-end

# 安装依赖
pnpm install

# 配置环境变量
# 复制 .env.example 为 .env.development 并修改配置

# 运行数据库迁移
pnpm migration:run

# 启动开发服务器
pnpm dev
```

### 前端启动

```bash
cd front-end

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 功能特性

- ✅ 用户管理
- ✅ 角色管理
- ✅ 菜单管理
- ✅ 部门管理
- ✅ 权限控制
- ✅ 文件上传/存储管理
- ✅ 系统配置
- ✅ 操作日志
- ✅ 登录日志
- ✅ 定时任务
- ✅ 字典管理
- ✅ 参数配置

## 开发规范

项目遵循严格的编码规范，详见 `.cursor/` 目录下的规范文档：

- [编码标准](./.cursor/rules/coding-standards.md)
- [后端规范](./.cursor/rules/backend-standards.md)
- [前端规范](./.cursor/rules/frontend-standards.md)
- [通用模式](./.cursor/rules/common-patterns.md)

## 部署

### Docker 部署

```bash
cd back-end
docker-compose up -d
```

### 生产环境

```bash
# 后端
cd back-end
pnpm build
pnpm start:prod

# 前端
cd front-end
pnpm build
# 将 dist 目录部署到 Nginx 或其他静态服务器
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！