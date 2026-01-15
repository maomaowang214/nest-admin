import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

/**
 * 踢下线用户请求DTO
 */
export class KickDto {
  @ApiProperty({
    description: '要踢下线的用户令牌ID',
    example: 'uuid-string',
  })
  @IsString()
  @IsNotEmpty({ message: '令牌ID不能为空' })
  tokenId: string
}
