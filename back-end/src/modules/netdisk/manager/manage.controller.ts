import { Body, Controller, Get, Header, Inject, Post, Query, Res } from '@nestjs/common'
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { FastifyReply } from 'fastify'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { IOssConfig, OssConfig } from '~/config'
import { ErrorEnum } from '~/constants/error-code.constant'

import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import { Public } from '~/modules/auth/decorators/public.decorator'
import { checkIsDemoMode } from '~/utils'

import { SFileInfoDetail, SFileList, UploadToken } from './manage.class'
import {
  DeleteDto,
  FileInfoDto,
  FileOpDto,
  GetFileListDto,
  MarkFileDto,
  MKDirDto,
  RenameDto,
} from './manage.dto'
import { NetDiskManageService } from './manage.service'

export const permissions = definePermission('netdisk:manage', {
  LIST: 'list',
  CREATE: 'create',
  INFO: 'info',
  UPDATE: 'update',
  DELETE: 'delete',
  MKDIR: 'mkdir',
  TOKEN: 'token',
  MARK: 'mark',
  DOWNLOAD: 'download',
  RENAME: 'rename',
  CUT: 'cut',
  COPY: 'copy',
} as const)

@ApiTags('NetDiskManage - 网盘管理模块')
@Controller('manage')
export class NetDiskManageController {
  constructor(
    private manageService: NetDiskManageService,
    @Inject(OssConfig.KEY) private qiniuConfig: IOssConfig,
  ) {}

  @Get('list')
  @ApiOperation({ summary: '获取文件列表' })
  @ApiOkResponse({ type: SFileList })
  @Perm(permissions.LIST)
  async list(@Query() dto: GetFileListDto): Promise<SFileList> {
    try {
      return await this.manageService.getFileList(
        dto.path || '',
        dto.marker || '',
        dto.key || '',
      )
    }
    catch (error) {
      // 检查是否是配置错误
      if (error instanceof Error) {
        if (error.message.includes('accessKey') || error.message.includes('配置不完整')) {
          throw new BusinessException(ErrorEnum.NETDISK_CONFIG_ERROR)
        }
        // 检查是否是网络连接错误
        if (
          error.message.includes('ECONNRESET')
          || error.message.includes('ETIMEDOUT')
          || error.message.includes('网络连接错误')
        ) {
          throw new BusinessException(
            `${ErrorEnum.NETDISK_ERROR.split(':')[0]}:网络连接失败，请检查网络连接或稍后重试`,
          )
        }
      }
      // BusinessException 只接受一个参数，将错误消息合并到 ErrorEnum 中
      const errorMessage = error instanceof Error ? error.message : '获取文件列表失败'
      throw new BusinessException(`${ErrorEnum.NETDISK_ERROR.split(':')[0]}:${errorMessage}`)
    }
  }

  @Post('mkdir')
  @ApiOperation({ summary: '创建文件夹，支持多级' })
  @Perm(permissions.MKDIR)
  async mkdir(@Body() dto: MKDirDto): Promise<void> {
    const result = await this.manageService.checkFileExist(
      `${dto.path}${dto.dirName}/`,
    )
    if (result)
      throw new BusinessException(ErrorEnum.OSS_FILE_OR_DIR_EXIST)

    await this.manageService.createDir(`${dto.path}${dto.dirName}`)
  }

  @Get('token')
  @ApiOperation({ summary: '获取上传Token，无Token前端无法上传' })
  @ApiOkResponse({ type: UploadToken })
  @Perm(permissions.TOKEN)
  async token(@AuthUser() user: IAuthUser): Promise<UploadToken> {
    checkIsDemoMode()

    return {
      token: this.manageService.createUploadToken(`${user.uid}`),
    }
  }

  @Get('info')
  @ApiOperation({ summary: '获取文件详细信息' })
  @ApiOkResponse({ type: SFileInfoDetail })
  @Perm(permissions.INFO)
  async info(@Query() dto: FileInfoDto): Promise<SFileInfoDetail> {
    return await this.manageService.getFileInfo(dto.name, dto.path)
  }

  @Post('mark')
  @ApiOperation({ summary: '添加文件备注' })
  @Perm(permissions.MARK)
  async mark(@Body() dto: MarkFileDto): Promise<void> {
    await this.manageService.changeFileHeaders(dto.name, dto.path, {
      mark: dto.mark,
    })
  }

  @Get('download')
  @ApiOperation({
    summary: '获取下载链接',
    description: '获取文件的下载链接，支持公开和私有访问方式。私有空间会生成带签名的临时链接，有效期10小时',
  })
  @ApiOkResponse({ type: String })
  @Perm(permissions.DOWNLOAD)
  async download(@Query() dto: FileInfoDto): Promise<string> {
    try {
      const fileKey = `${dto.path || ''}${dto.name}`
      return this.manageService.getDownloadLink(fileKey)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取下载链接失败'
      throw new BusinessException(`${ErrorEnum.NETDISK_ERROR.split(':')[0]}:${errorMessage}`)
    }
  }

  @Get('preview')
  @ApiOperation({
    summary: '获取图片预览链接',
    description: '获取图片的预览链接，适用于私有空间的图片预览，会自动添加图片处理参数',
  })
  @ApiOkResponse({ type: String })
  @Perm(permissions.DOWNLOAD)
  async preview(@Query() dto: FileInfoDto): Promise<string> {
    try {
      const fileKey = `${dto.path || ''}${dto.name}`
      return this.manageService.getImagePreviewLink(fileKey)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取预览链接失败'
      throw new BusinessException(`${ErrorEnum.NETDISK_ERROR.split(':')[0]}:${errorMessage}`)
    }
  }

  @Get('proxy')
  @ApiOperation({
    summary: '图片代理接口',
    description: '代理图片请求，解决Mixed Content问题。前端通过HTTPS访问此接口，后端从HTTP的七牛云获取图片并返回。此接口为公开接口，但会验证URL是否来自配置的七牛云域名',
  })
  @Public()
  async proxyImage(@Query('url') imageUrl: string, @Res() res: FastifyReply): Promise<void> {
    try {
      if (!imageUrl) {
        throw new BusinessException(ErrorEnum.NETDISK_ERROR)
      }

      // 解码URL参数
      const decodedUrl = decodeURIComponent(imageUrl)

      // 验证URL格式
      if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
        throw new BusinessException('图片URL格式不正确')
      }

      // 验证URL是否来自七牛云域名（安全验证，防止代理任意URL）
      const qiniuDomain = this.qiniuConfig.domain.replace(/^https?:\/\//, '')
      if (!decodedUrl.includes(qiniuDomain)) {
        throw new BusinessException('图片URL不在允许的域名范围内')
      }

      // 验证URL是否包含签名token（进一步安全验证，确保是有效的七牛云签名URL）
      if (!decodedUrl.includes('token=') && this.qiniuConfig.access === 'private') {
        throw new BusinessException('私有空间的图片URL必须包含签名token')
      }

      // 获取图片数据
      const imageBuffer = await this.manageService.proxyImage(decodedUrl)

      // 根据URL判断图片类型
      let contentType = 'image/jpeg'
      if (imageUrl.includes('.png')) {
        contentType = 'image/png'
      }
      else if (imageUrl.includes('.gif')) {
        contentType = 'image/gif'
      }
      else if (imageUrl.includes('.webp')) {
        contentType = 'image/webp'
      }

      // 设置响应头（Fastify API）
      res.header('Content-Type', contentType)
      res.header('Cache-Control', 'public, max-age=3600')
      res.header('Content-Length', imageBuffer.length.toString())

      // 返回图片数据
      res.send(imageBuffer)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : '代理图片失败'
      throw new BusinessException(`${ErrorEnum.NETDISK_ERROR.split(':')[0]}:${errorMessage}`)
    }
  }

  @Post('rename')
  @ApiOperation({ summary: '重命名文件或文件夹' })
  @Perm(permissions.RENAME)
  async rename(@Body() dto: RenameDto): Promise<void> {
    const result = await this.manageService.checkFileExist(
      `${dto.path}${dto.toName}${dto.type === 'dir' ? '/' : ''}`,
    )
    if (result)
      throw new BusinessException(ErrorEnum.OSS_FILE_OR_DIR_EXIST)

    if (dto.type === 'file')
      await this.manageService.renameFile(dto.path, dto.name, dto.toName)
    else
      await this.manageService.renameDir(dto.path, dto.name, dto.toName)
  }

  @Post('delete')
  @ApiOperation({ summary: '删除文件或文件夹' })
  @Perm(permissions.DELETE)
  async delete(@Body() dto: DeleteDto): Promise<void> {
    await this.manageService.deleteMultiFileOrDir(dto.files, dto.path)
  }

  @Post('cut')
  @ApiOperation({ summary: '剪切文件或文件夹，支持批量' })
  @Perm(permissions.CUT)
  async cut(@Body() dto: FileOpDto): Promise<void> {
    if (dto.originPath === dto.toPath)
      throw new BusinessException(ErrorEnum.OSS_NO_OPERATION_REQUIRED)

    await this.manageService.moveMultiFileOrDir(
      dto.files,
      dto.originPath,
      dto.toPath,
    )
  }

  @Post('copy')
  @ApiOperation({ summary: '复制文件或文件夹，支持批量' })
  @Perm(permissions.COPY)
  async copy(@Body() dto: FileOpDto): Promise<void> {
    await this.manageService.copyMultiFileOrDir(
      dto.files,
      dto.originPath,
      dto.toPath,
    )
  }
}
