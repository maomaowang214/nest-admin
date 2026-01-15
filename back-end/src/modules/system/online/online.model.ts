import { ApiProperty, OmitType } from '@nestjs/swagger'

import { LoginLogInfo } from '../log/models/log.model'

/**
 * 在线用户信息模型
 * 继承自登录日志信息，但移除了 id 字段，并添加了在线用户特有的字段
 */
export class OnlineUserInfo extends OmitType(LoginLogInfo, ['id'] as const) {
  @ApiProperty({ description: '访问令牌ID', example: 'uuid-string' })
  tokenId: string

  @ApiProperty({ description: '部门名称', example: '技术部' })
  deptName: string

  @ApiProperty({ description: '用户ID', example: '269710037142867969' })
  uid: string

  @ApiProperty({
    description: '是否为当前登录用户',
    example: false,
    required: false,
  })
  isCurrent?: boolean

  @ApiProperty({
    description: '是否禁用操作（当前用户或超级管理员不能下线）',
    example: false,
    required: false,
  })
  disable?: boolean
}
