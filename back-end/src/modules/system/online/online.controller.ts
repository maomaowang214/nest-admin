import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import { ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger'

import { FastifyRequest } from 'fastify'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'

import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import { KickDto } from './online.dto'
import { OnlineUserInfo } from './online.model'
import { OnlineService } from './online.service'

export const permissions = definePermission('system:online', ['list', 'kick'] as const)

/**
 * 在线用户控制器
 * 提供在线用户查询和下线功能
 */
@ApiTags('System - 在线用户模块')
@ApiSecurityAuth()
@ApiExtraModels(OnlineUserInfo)
@Controller('online')
export class OnlineController {
  constructor(private readonly onlineService: OnlineService) {}

  /**
   * 查询当前在线用户列表
   */
  @Get('list')
  @ApiOperation({ summary: '查询当前在线用户', description: '获取系统中所有在线用户的信息列表' })
  @ApiResult({ type: [OnlineUserInfo] })
  @Perm(permissions.LIST)
  async getOnlineUserList(@Req() req: FastifyRequest): Promise<OnlineUserInfo[]> {
    return this.onlineService.getOnlineUserList(req.accessToken)
  }

  /**
   * 下线指定在线用户
   */
  @Post('kick')
  @ApiOperation({
    summary: '下线指定在线用户',
    description: '强制下线指定的在线用户，不能下线超级管理员和自己',
  })
  @Perm(permissions.KICK)
  async kickUser(@Body() dto: KickDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.onlineService.kickUser(dto.tokenId, user)
  }
}
