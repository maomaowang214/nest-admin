import { ArrayNotEmpty, IsArray, IsDefined, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class BatchDeleteDto {
  @IsDefined()
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  ids: string[]
}
