import { ApiProperty } from '@nestjs/swagger'

/**
 * 登录日志信息模型
 */
export class LoginLogInfo {
  @ApiProperty({ description: '日志编号', example: '269710037142867969' })
  id: string

  @ApiProperty({ description: '登录IP', example: '127.0.0.1' })
  ip: string

  @ApiProperty({ description: '登录地址', example: '内网IP' })
  address: string

  @ApiProperty({ description: '操作系统', example: 'Windows 10' })
  os: string

  @ApiProperty({ description: '浏览器', example: 'Chrome 120.0.0.0' })
  browser: string

  @ApiProperty({ description: '登录用户名', example: 'admin' })
  username: string

  @ApiProperty({
    description: '登录时间',
    example: '2026-01-14 16:44:38.333843',
  })
  time: string
}

/**
 * 任务日志信息模型
 */
export class TaskLogInfo {
  @ApiProperty({ description: '日志编号' })
  id: string

  @ApiProperty({ description: '任务编号' })
  taskId: string

  @ApiProperty({ description: '任务名称' })
  name: string

  @ApiProperty({ description: '创建时间' })
  createdAt: string

  @ApiProperty({ description: '耗时（毫秒）' })
  consumeTime: number

  @ApiProperty({ description: '执行信息' })
  detail: string

  @ApiProperty({ description: '任务执行状态：0-失败，1-成功' })
  status: number
}
