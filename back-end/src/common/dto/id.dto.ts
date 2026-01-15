import { IsString, MinLength } from 'class-validator'

export class IdDto {
  @IsString()
  @MinLength(1)
  id: string
}
