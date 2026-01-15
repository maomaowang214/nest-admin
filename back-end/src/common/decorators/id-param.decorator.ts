import { NotAcceptableException, Param, PipeTransform } from '@nestjs/common'

class IdParamPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new NotAcceptableException('id 格式不正确')
    }
    return value
  }
}

export function IdParam() {
  return Param('id', new IdParamPipe())
}
