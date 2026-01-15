---
name: 后端编码规范
description: NestJS 后端编码规范和最佳实践
---

# 后端编码规范 (NestJS)

## 项目结构

```
modules/{module}/
├── {module}.controller.ts    # 控制器
├── {module}.service.ts       # 服务层
├── {module}.entity.ts         # 实体类
├── {module}.module.ts         # 模块定义
├── dto/                       # 数据传输对象
│   ├── {module}.dto.ts
│   └── {action}.dto.ts
└── constant.ts               # 常量定义
```

## 命名规范

- **类**: PascalCase - `UserController`, `UserService`
- **文件**: kebab-case - `user.controller.ts`
- **变量/函数**: camelCase - `userName`, `getUserList()`
- **常量**: UPPER_SNAKE_CASE - `MAX_RETRY_COUNT`

## 导入顺序

```typescript
// 1. NestJS 核心模块
import { Controller, Get, Post } from '@nestjs/common'

// 2. 第三方库
import { isEmpty } from 'lodash'

// 3. 项目内部（~ 别名）
import { ApiResult } from '~/common/decorators/api-result.decorator'

// 4. 相对路径
import { UserService } from './user.service'
```

## Controller 规范

```typescript
@ApiTags('System - 用户模块')
@ApiSecurityAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResult({ type: [UserEntity], isPage: true })
  @Perm(permissions.LIST)
  async list(@Query() dto: UserQueryDto) {
    return this.userService.list(dto)
  }
}
```

## Service 规范

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async list(dto: UserQueryDto) {
    return paginate(this.userRepository, dto)
  }

  async info(id: string): Promise<UserEntity> {
    const entity = await this.userRepository.findOneBy({ id })
    if (isEmpty(entity)) {
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)
    }
    return entity
  }
}
```

## 错误处理

```typescript
// ✅ 正确
import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'

if (isEmpty(user)) {
  throw new BusinessException(ErrorEnum.USER_NOT_FOUND)
}

// ❌ 错误
if (isEmpty(user)) {
  throw new Error('User not found')
}
```

## DTO 验证

```typescript
import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength } from 'class-validator'

export class UserCreateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  username: string

  @IsEmail()
  email: string
}
```

## 权限控制

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

## 数据库查询

```typescript
// ✅ 使用分页工具
import { paginate } from '~/helper/paginate'
return paginate(this.repository, dto)

// ✅ 使用查询构建器
const users = await this.repository
  .createQueryBuilder('user')
  .select(['user.id', 'user.name'])
  .where('user.status = :status', { status: 1 })
  .getMany()
```
