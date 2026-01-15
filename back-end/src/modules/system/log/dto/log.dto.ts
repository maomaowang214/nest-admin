import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsOptional, IsString } from 'class-validator'

import { PagerDto } from '~/common/dto/pager.dto'

/**
 * 登录日志查询DTO
 */
export class LoginLogQueryDto extends PagerDto {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string

  @ApiProperty({
    description: '登录IP',
    example: '127.0.0.1',
    required: false,
  })
  @IsOptional()
  @IsString()
  ip?: string

  @ApiProperty({
    description: '登录地点',
    example: '内网IP',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string

  @ApiProperty({
    description: '登录时间范围',
    example: ['2026-01-01 00:00:00', '2026-01-31 23:59:59'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  time?: string[]
}

/**
 * 任务日志查询DTO
 */
export class TaskLogQueryDto extends PagerDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  username?: string

  @ApiProperty({ description: '登录IP', required: false })
  @IsString()
  @IsOptional()
  ip?: string

  @ApiProperty({ description: '登录时间', required: false })
  @IsOptional()
  time?: string[]
}

/**
 * 验证码日志查询DTO
 */
export class CaptchaLogQueryDto extends PagerDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  username?: string

  @ApiProperty({ description: '验证码', required: false })
  @IsString()
  @IsOptional()
  code?: string

  @ApiProperty({ description: '发送时间', required: false })
  @IsOptional()
  time?: string[]
}
