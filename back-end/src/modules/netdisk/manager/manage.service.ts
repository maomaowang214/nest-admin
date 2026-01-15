import { basename, extname } from 'node:path'

import { HttpService } from '@nestjs/axios'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { isEmpty } from 'lodash'
import * as qiniu from 'qiniu'
import { auth, conf, rs } from 'qiniu'
import { firstValueFrom } from 'rxjs'

import { IOssConfig, OssConfig } from '~/config'
import { NETDISK_COPY_SUFFIX, NETDISK_DELIMITER, NETDISK_HANDLE_MAX_ITEM, NETDISK_LIMIT } from '~/constants/oss.constant'

import { AccountInfo } from '~/modules/user/user.model'
import { UserService } from '~/modules/user/user.service'

import { generateRandomValue } from '~/utils'

import { SFileInfo, SFileInfoDetail, SFileList } from './manage.class'
import { FileOpItem } from './manage.dto'

@Injectable()
export class NetDiskManageService {
  private readonly logger = new Logger(NetDiskManageService.name)
  private config: conf.Config
  private mac: auth.digest.Mac
  private bucketManager: rs.BucketManager

  constructor(
    @Inject(OssConfig.KEY) private qiniuConfig: IOssConfig,
    private userService: UserService,
    private httpService: HttpService,
  ) {
    // 验证配置是否完整
    if (!this.qiniuConfig.accessKey || !this.qiniuConfig.secretKey || !this.qiniuConfig.bucket) {
      throw new Error(
        'OSS配置不完整，请检查环境变量：OSS_ACCESSKEY, OSS_SECRETKEY, OSS_BUCKET',
      )
    }

    this.mac = new qiniu.auth.digest.Mac(
      this.qiniuConfig.accessKey,
      this.qiniuConfig.secretKey,
    )
    this.config = new qiniu.conf.Config({
      zone: this.qiniuConfig.zone,
    })
    // bucket manager
    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config)
  }

  /**
   * 获取文件列表
   * @param prefix 当前文件夹路径，搜索模式下会被忽略
   * @param marker 下一页标识
   * @returns iFileListResult
   */
  async getFileList(prefix = '', marker = '', skey = ''): Promise<SFileList> {
    // 是否需要搜索
    const searching = !isEmpty(skey)
    return new Promise<SFileList>((resolve, reject) => {
      this.bucketManager.listPrefix(
        this.qiniuConfig.bucket,
        {
          prefix: searching ? '' : prefix,
          limit: NETDISK_LIMIT,
          delimiter: searching ? '' : NETDISK_DELIMITER,
          marker,
        },
        (err, respBody, respInfo) => {
          if (err) {
            // 处理网络错误
            const errorCode = (err as any)?.code
            if (errorCode === 'ECONNRESET' || errorCode === 'ETIMEDOUT' || errorCode === 'ENOTFOUND') {
              this.logger.error(
                `七牛云API连接错误: ${errorCode}, message: ${err.message}`,
                err.stack,
              )
              reject(
                new Error(
                  `网络连接错误，请检查网络连接或七牛云配置。错误代码: ${errorCode}`,
                ),
              )
              return
            }
            // 处理其他错误
            this.logger.error(`七牛云API调用失败: ${err.message}`, err.stack)
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            // 如果这个nextMarker不为空，那么还有未列举完毕的文件列表，下次调用listPrefix的时候，
            // 指定options里面的marker为这个值
            const fileList: SFileInfo[] = []
            // 处理目录，但只有非搜索模式下可用
            if (!searching && !isEmpty(respBody.commonPrefixes)) {
              // dir
              for (const dirPath of respBody.commonPrefixes) {
                const name = (dirPath as string)
                  .substr(0, dirPath.length - 1)
                  .replace(prefix, '')
                if (isEmpty(skey) || name.includes(skey)) {
                  fileList.push({
                    name: (dirPath as string)
                      .substr(0, dirPath.length - 1)
                      .replace(prefix, ''),
                    type: 'dir',
                    id: generateRandomValue(10),
                  })
                }
              }
            }
            // handle items
            if (!isEmpty(respBody.items)) {
              // file
              for (const item of respBody.items) {
                // 搜索模式下处理
                if (searching) {
                  const pathList: string[] = item.key.split(NETDISK_DELIMITER)
                  // dir is empty stirng, file is key string
                  const name = pathList.pop()
                  if (
                    item.key.endsWith(NETDISK_DELIMITER)
                    && pathList[pathList.length - 1].includes(skey)
                  ) {
                    // 结果是目录
                    const ditName = pathList.pop()
                    fileList.push({
                      id: generateRandomValue(10),
                      name: ditName,
                      type: 'dir',
                      belongTo: pathList.join(NETDISK_DELIMITER),
                    })
                  }
                  else if (name.includes(skey)) {
                    // 文件
                    fileList.push({
                      id: generateRandomValue(10),
                      name,
                      type: 'file',
                      fsize: item.fsize,
                      mimeType: item.mimeType,
                      putTime: new Date(Number.parseInt(item.putTime) / 10000),
                      belongTo: pathList.join(NETDISK_DELIMITER),
                    })
                  }
                }
                else {
                  // 正常获取列表
                  const fileKey = item.key.replace(prefix, '') as string
                  if (!isEmpty(fileKey)) {
                    fileList.push({
                      id: generateRandomValue(10),
                      name: fileKey,
                      type: 'file',
                      fsize: item.fsize,
                      mimeType: item.mimeType,
                      putTime: new Date(Number.parseInt(item.putTime) / 10000),
                    })
                  }
                }
              }
            }
            resolve({
              list: fileList,
              marker: respBody.marker || null,
            })
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        },
      )
    })
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(name: string, path: string): Promise<SFileInfoDetail> {
    return new Promise((resolve, reject) => {
      this.bucketManager.stat(
        this.qiniuConfig.bucket,
        `${path}${name}`,
        (err, respBody, respInfo) => {
          if (err) {
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            const detailInfo: SFileInfoDetail = {
              fsize: respBody.fsize,
              hash: respBody.hash,
              md5: respBody.md5,
              mimeType: respBody.mimeType.split('/x-qn-meta')[0],
              putTime: new Date(Number.parseInt(respBody.putTime) / 10000),
              type: respBody.type,
              uploader: '',
              mark: respBody?.['x-qn-meta']?.['!mark'] ?? '',
            }
            if (!respBody.endUser) {
              resolve(detailInfo)
            }
            else {
              this.userService
                .getAccountInfo(respBody.endUser)
                .then((user: AccountInfo) => {
                  if (isEmpty(user)) {
                    resolve(detailInfo)
                  }
                  else {
                    detailInfo.uploader = user.username
                    resolve(detailInfo)
                  }
                })
            }
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        },
      )
    })
  }

  /**
   * 修改文件MimeType
   */
  async changeFileHeaders(
    name: string,
    path: string,
    headers: { [k: string]: string },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bucketManager.changeHeaders(
        this.qiniuConfig.bucket,
        `${path}${name}`,
        headers,
        (err, _, respInfo) => {
          if (err) {
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            resolve()
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        },
      )
    })
  }

  /**
   * 创建文件夹
   * @returns true创建成功
   */
  async createDir(dirName: string): Promise<void> {
    const safeDirName = dirName.endsWith('/') ? dirName : `${dirName}/`
    return new Promise((resolve, reject) => {
      // 上传一个空文件以用于显示文件夹效果
      const formUploader = new qiniu.form_up.FormUploader(this.config)
      const putExtra = new qiniu.form_up.PutExtra()
      formUploader.put(
        this.createUploadToken(''),
        safeDirName,
        ' ',
        putExtra,
        (respErr, respBody, respInfo) => {
          if (respErr) {
            reject(respErr)
            return
          }
          if (respInfo.statusCode === 200) {
            resolve()
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        },
      )
    })
  }

  /**
   * 检查文件是否存在，同可检查目录
   */
  async checkFileExist(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // fix path end must a /

      // 检测文件夹是否存在
      this.bucketManager.stat(
        this.qiniuConfig.bucket,
        filePath,
        (respErr, respBody, respInfo) => {
          if (respErr) {
            reject(respErr)
            return
          }
          if (respInfo.statusCode === 200) {
            // 文件夹存在
            resolve(true)
          }
          else if (respInfo.statusCode === 612) {
            // 文件夹不存在
            resolve(false)
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        },
      )
    })
  }

  /**
   * 创建Upload Token, 默认过期时间一小时
   * @param endUser 终端用户标识（通常是用户ID）
   * @returns upload token
   */
  createUploadToken(endUser: string): string {
    try {
      // 创建上传策略
      const policy = new qiniu.rs.PutPolicy({
        scope: this.qiniuConfig.bucket,
        insertOnly: 1, // 不允许覆盖已存在的文件
        fsizeLimit: 1024 ** 2 * 10, // 文件大小限制：10MB
        endUser, // 终端用户标识
        // 设置返回信息，包含文件信息
        returnBody:
          '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"mimeType":"$(mimeType)","putTime":$(putTime)}',
      })

      // 生成上传Token
      const uploadToken = policy.uploadToken(this.mac)

      this.logger.debug(`生成上传Token: endUser=${endUser}`)
      return uploadToken
    }
    catch (error) {
      this.logger.error(`生成上传Token失败: endUser=${endUser}`, error)
      throw error
    }
  }

  /**
   * 重命名文件
   * @param dir 文件路径
   * @param name 文件名称
   */
  async renameFile(dir: string, name: string, toName: string): Promise<void> {
    const fileName = `${dir}${name}`
    const toFileName = `${dir}${toName}`
    const op = {
      force: true,
    }
    return new Promise((resolve, reject) => {
      this.bucketManager.move(
        this.qiniuConfig.bucket,
        fileName,
        this.qiniuConfig.bucket,
        toFileName,
        op,
        (err, respBody, respInfo) => {
          if (err) {
            reject(err)
          }
          else {
            if (respInfo.statusCode === 200) {
              resolve()
            }
            else {
              reject(
                new Error(
                  `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
                ),
              )
            }
          }
        },
      )
    })
  }

  /**
   * 移动文件
   */
  async moveFile(dir: string, toDir: string, name: string): Promise<void> {
    const fileName = `${dir}${name}`
    const toFileName = `${toDir}${name}`
    const op = {
      force: true,
    }
    return new Promise((resolve, reject) => {
      this.bucketManager.move(
        this.qiniuConfig.bucket,
        fileName,
        this.qiniuConfig.bucket,
        toFileName,
        op,
        (err, respBody, respInfo) => {
          if (err) {
            reject(err)
          }
          else {
            if (respInfo.statusCode === 200) {
              resolve()
            }
            else {
              reject(
                new Error(
                  `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
                ),
              )
            }
          }
        },
      )
    })
  }

  /**
   * 复制文件
   */
  async copyFile(dir: string, toDir: string, name: string): Promise<void> {
    const fileName = `${dir}${name}`
    // 拼接文件名
    const ext = extname(name)
    const bn = basename(name, ext)
    const toFileName = `${toDir}${bn}${NETDISK_COPY_SUFFIX}${ext}`
    const op = {
      force: true,
    }
    return new Promise((resolve, reject) => {
      this.bucketManager.copy(
        this.qiniuConfig.bucket,
        fileName,
        this.qiniuConfig.bucket,
        toFileName,
        op,
        (err, respBody, respInfo) => {
          if (err) {
            reject(err)
          }
          else {
            if (respInfo.statusCode === 200) {
              resolve()
            }
            else {
              reject(
                new Error(
                  `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
                ),
              )
            }
          }
        },
      )
    })
  }

  /**
   * 重命名文件夹
   */
  async renameDir(path: string, name: string, toName: string): Promise<void> {
    const dirName = `${path}${name}`
    const toDirName = `${path}${toName}`
    let hasFile = true
    let marker = ''
    const op = {
      force: true,
    }
    const bucketName = this.qiniuConfig.bucket
    while (hasFile) {
      await new Promise<void>((resolve, reject) => {
        // 列举当前目录下的所有文件
        this.bucketManager.listPrefix(
          this.qiniuConfig.bucket,
          {
            prefix: dirName,
            limit: NETDISK_HANDLE_MAX_ITEM,
            marker,
          },
          (err, respBody, respInfo) => {
            if (err) {
              reject(err)
              return
            }
            if (respInfo.statusCode === 200) {
              const moveOperations = respBody.items.map((item) => {
                const { key } = item
                const destKey = key.replace(dirName, toDirName)
                return qiniu.rs.moveOp(
                  bucketName,
                  key,
                  bucketName,
                  destKey,
                  op,
                )
              })
              this.bucketManager.batch(
                moveOperations,
                (err2, respBody2, respInfo2) => {
                  if (err2) {
                    reject(err2)
                    return
                  }
                  if (respInfo2.statusCode === 200) {
                    if (isEmpty(respBody.marker))
                      hasFile = false
                    else
                      marker = respBody.marker

                    resolve()
                  }
                  else {
                    reject(
                      new Error(
                        `Qiniu Error Code: ${respInfo2.statusCode}, Info: ${respInfo2.statusMessage}`,
                      ),
                    )
                  }
                },
              )
            }
            else {
              reject(
                new Error(
                  `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
                ),
              )
            }
          },
        )
      })
    }
  }

  /**
   * 获取七牛下载的文件url链接
   * 根据七牛云文档：https://developer.qiniu.com/kodo/1289/nodejs#6
   * 私有资源下载需要使用 privateDownloadUrl 生成带签名的临时链接
   * @param key 文件路径
   * @returns 下载链接
   */
  getDownloadLink(key: string): string {
    try {
      // 确保key不为空
      if (!key || key.trim() === '') {
        throw new Error('文件路径不能为空')
      }

      // 清理key，确保格式正确
      const cleanKey = key.startsWith('/') ? key.substring(1) : key

      // 确保domain不包含协议（七牛云SDK要求domain是纯域名）
      let domain = this.qiniuConfig.domain
      if (domain.startsWith('http://')) {
        domain = domain.substring(7)
      }
      else if (domain.startsWith('https://')) {
        domain = domain.substring(8)
      }

      let downloadUrl: string

      if (this.qiniuConfig.access === 'public') {
        // 公开访问，直接返回公开下载链接
        downloadUrl = this.bucketManager.publicDownloadUrl(domain, cleanKey)
        // 确保返回的URL包含协议
        if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
          downloadUrl = `https://${downloadUrl}`
        }
      }
      else if (this.qiniuConfig.access === 'private') {
        // 私有访问，生成带签名的下载链接
        // 根据文档：私有资源下载需要使用 privateDownloadUrl，有效期10小时（36000秒）
        const expires = Math.floor(Date.now() / 1000) + 36000
        downloadUrl = this.bucketManager.privateDownloadUrl(
          `http://${domain}`,
          cleanKey,
          expires,
        )

        // 确保返回的URL使用http协议（私有空间统一使用http，避免Mixed Content问题）
        if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
          downloadUrl = `http://${downloadUrl}`
        }
        // 如果返回的是https，强制改为http
        if (downloadUrl.startsWith('https://')) {
          downloadUrl = downloadUrl.replace('https://', 'http://')
        }
      }
      else {
        throw new Error(`不支持的访问类型: ${this.qiniuConfig.access}`)
      }

      this.logger.debug(`生成下载链接: key=${cleanKey}, access=${this.qiniuConfig.access}, url=${downloadUrl}`)
      return downloadUrl
    }
    catch (error) {
      this.logger.error(`生成下载链接失败: key=${key}`, error)
      throw error
    }
  }

  /**
   * 获取图片预览链接（带图片处理参数）
   * 适用于私有空间的图片预览
   * 参考SDK privateDownloadUrl 的签名方式
   * @param key 文件路径
   * @param imageView 图片处理参数，如 "imageView2/2/w/500/h/210"
   * @param domainOverride 可选域名覆盖（不含协议）
   * @param protocolOverride 可选协议覆盖（http/https）
   * @returns 预览链接
   */
  getImagePreviewLink(
    key: string,
    imageView?: string,
    domainOverride?: string,
    protocolOverride?: string,
  ): string {
    try {
      // 确保key不为空
      if (!key || key.trim() === '') {
        throw new Error('文件路径不能为空')
      }

      // 清理key，确保格式正确
      const cleanKey = key.startsWith('/') ? key.substring(1) : key

      // 默认图片处理参数：缩略图 500x210
      const defaultImageView = 'imageView2/2/w/500/h/210'
      const imageViewParam = imageView || defaultImageView

      // 规范化domain与协议
      let rawDomain = domainOverride || this.qiniuConfig.domain
      let protocol = protocolOverride
      
      // 从domain中提取协议（如果包含）
      if (rawDomain.startsWith('http://')) {
        if (!protocol) protocol = 'http'
        rawDomain = rawDomain.substring(7)
      }
      else if (rawDomain.startsWith('https://')) {
        if (!protocol) protocol = 'https'
        rawDomain = rawDomain.substring(8)
      }
      
      // 私有空间强制使用http协议（解决Mixed Content问题）
      if (this.qiniuConfig.access === 'private') {
        protocol = 'http'
      }
      else if (!protocol) {
        // 公开空间默认使用https
        protocol = 'https'
      }
      
      const domainWithProtocol = `${protocol}://${rawDomain}`

      let previewUrl: string

      if (this.qiniuConfig.access === 'public') {
        // 公开访问，直接在URL后添加图片处理参数
        const baseUrl = this.bucketManager.publicDownloadUrl(domainWithProtocol, cleanKey)
        const separator = baseUrl.includes('?') ? '&' : '?'
        previewUrl = `${baseUrl}${separator}${imageViewParam}`
      }
      else if (this.qiniuConfig.access === 'private') {
        // 私有访问，按SDK privateDownloadUrl 方式签名（包含协议与处理参数）
        const expires = Math.floor(Date.now() / 1000) + 36000
        const baseUrl = this.bucketManager.publicDownloadUrl(domainWithProtocol, cleanKey)
        const separator = baseUrl.includes('?') ? '&' : '?'
        const baseWithFop = `${baseUrl}${separator}${imageViewParam}`
        const urlToSign = `${baseWithFop}${baseWithFop.includes('?') ? '&' : '?'}e=${expires}`

        const signature = qiniu.util.hmacSha1(urlToSign, this.mac.secretKey)
        const encodedSign = qiniu.util.base64ToUrlSafe(signature)
        const downloadToken = `${this.mac.accessKey}:${encodedSign}`
        previewUrl = `${urlToSign}&token=${downloadToken}`
      }
      else {
        throw new Error(`不支持的访问类型: ${this.qiniuConfig.access}`)
      }

      this.logger.debug(`生成图片预览链接: key=${cleanKey}, imageView=${imageViewParam}, url=${previewUrl}`)
      return previewUrl
    }
    catch (error) {
      this.logger.error(`生成图片预览链接失败: key=${key}`, error)
      throw error
    }
  }

  /**
   * 删除文件
   * @param dir 删除的文件夹目录
   * @param name 文件名
   */
  async deleteFile(dir: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bucketManager.delete(
        this.qiniuConfig.bucket,
        `${dir}${name}`,
        (err, respBody, respInfo) => {
          if (err) {
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            resolve()
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        },
      )
    })
  }

  /**
   * 删除文件夹
   * @param fileList 需要操作的文件或文件夹
   * @param dir 文件目录名称
   */
  async deleteMultiFileOrDir(
    fileList: FileOpItem[],
    dir: string,
  ): Promise<void> {
    const files = fileList.filter(item => item.type === 'file')
    if (files.length > 0) {
      // 批处理文件
      const copyOperations = files.map((item) => {
        const fileName = `${dir}${item.name}`
        return qiniu.rs.deleteOp(this.qiniuConfig.bucket, fileName)
      })
      await new Promise<void>((resolve, reject) => {
        this.bucketManager.batch(copyOperations, (err, respBody, respInfo) => {
          if (err) {
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            resolve()
          }
          else if (respInfo.statusCode === 298) {
            reject(new Error('操作异常，但部分文件夹删除成功'))
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        })
      })
    }
    // 处理文件夹
    const dirs = fileList.filter(item => item.type === 'dir')
    if (dirs.length > 0) {
      // 处理文件夹的复制
      for (let i = 0; i < dirs.length; i++) {
        const dirName = `${dir}${dirs[i].name}/`
        let hasFile = true
        let marker = ''
        while (hasFile) {
          await new Promise<void>((resolve, reject) => {
            // 列举当前目录下的所有文件
            this.bucketManager.listPrefix(
              this.qiniuConfig.bucket,
              {
                prefix: dirName,
                limit: NETDISK_HANDLE_MAX_ITEM,
                marker,
              },
              (err, respBody, respInfo) => {
                if (err) {
                  reject(err)
                  return
                }
                if (respInfo.statusCode === 200) {
                  const moveOperations = respBody.items.map((item) => {
                    const { key } = item
                    return qiniu.rs.deleteOp(this.qiniuConfig.bucket, key)
                  })
                  this.bucketManager.batch(
                    moveOperations,
                    (err2, respBody2, respInfo2) => {
                      if (err2) {
                        reject(err2)
                        return
                      }
                      if (respInfo2.statusCode === 200) {
                        if (isEmpty(respBody.marker))
                          hasFile = false
                        else
                          marker = respBody.marker

                        resolve()
                      }
                      else {
                        reject(
                          new Error(
                            `Qiniu Error Code: ${respInfo2.statusCode}, Info: ${respInfo2.statusMessage}`,
                          ),
                        )
                      }
                    },
                  )
                }
                else {
                  reject(
                    new Error(
                      `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
                    ),
                  )
                }
              },
            )
          })
        }
      }
    }
  }

  /**
   * 复制文件，含文件夹
   */
  async copyMultiFileOrDir(
    fileList: FileOpItem[],
    dir: string,
    toDir: string,
  ): Promise<void> {
    const files = fileList.filter(item => item.type === 'file')
    const op = {
      force: true,
    }
    if (files.length > 0) {
      // 批处理文件
      const copyOperations = files.map((item) => {
        const fileName = `${dir}${item.name}`
        // 拼接文件名
        const ext = extname(item.name)
        const bn = basename(item.name, ext)
        const toFileName = `${toDir}${bn}${NETDISK_COPY_SUFFIX}${ext}`
        return qiniu.rs.copyOp(
          this.qiniuConfig.bucket,
          fileName,
          this.qiniuConfig.bucket,
          toFileName,
          op,
        )
      })
      await new Promise<void>((resolve, reject) => {
        this.bucketManager.batch(copyOperations, (err, respBody, respInfo) => {
          if (err) {
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            resolve()
          }
          else if (respInfo.statusCode === 298) {
            reject(new Error('操作异常，但部分文件夹删除成功'))
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        })
      })
    }
    // 处理文件夹
    const dirs = fileList.filter(item => item.type === 'dir')
    if (dirs.length > 0) {
      // 处理文件夹的复制
      for (let i = 0; i < dirs.length; i++) {
        const dirName = `${dir}${dirs[i].name}/`
        const copyDirName = `${toDir}${dirs[i].name}${NETDISK_COPY_SUFFIX}/`
        let hasFile = true
        let marker = ''
        while (hasFile) {
          await new Promise<void>((resolve, reject) => {
            // 列举当前目录下的所有文件
            this.bucketManager.listPrefix(
              this.qiniuConfig.bucket,
              {
                prefix: dirName,
                limit: NETDISK_HANDLE_MAX_ITEM,
                marker,
              },
              (err, respBody, respInfo) => {
                if (err) {
                  reject(err)
                  return
                }
                if (respInfo.statusCode === 200) {
                  const moveOperations = respBody.items.map((item) => {
                    const { key } = item
                    const destKey = key.replace(dirName, copyDirName)
                    return qiniu.rs.copyOp(
                      this.qiniuConfig.bucket,
                      key,
                      this.qiniuConfig.bucket,
                      destKey,
                      op,
                    )
                  })
                  this.bucketManager.batch(
                    moveOperations,
                    (err2, respBody2, respInfo2) => {
                      if (err2) {
                        reject(err2)
                        return
                      }
                      if (respInfo2.statusCode === 200) {
                        if (isEmpty(respBody.marker))
                          hasFile = false
                        else
                          marker = respBody.marker

                        resolve()
                      }
                      else {
                        reject(
                          new Error(
                            `Qiniu Error Code: ${respInfo2.statusCode}, Info: ${respInfo2.statusMessage}`,
                          ),
                        )
                      }
                    },
                  )
                }
                else {
                  reject(
                    new Error(
                      `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
                    ),
                  )
                }
              },
            )
          })
        }
      }
    }
  }

  /**
   * 移动文件，含文件夹
   */
  async moveMultiFileOrDir(
    fileList: FileOpItem[],
    dir: string,
    toDir: string,
  ): Promise<void> {
    const files = fileList.filter(item => item.type === 'file')
    const op = {
      force: true,
    }
    if (files.length > 0) {
      // 批处理文件
      const copyOperations = files.map((item) => {
        const fileName = `${dir}${item.name}`
        const toFileName = `${toDir}${item.name}`
        return qiniu.rs.moveOp(
          this.qiniuConfig.bucket,
          fileName,
          this.qiniuConfig.bucket,
          toFileName,
          op,
        )
      })
      await new Promise<void>((resolve, reject) => {
        this.bucketManager.batch(copyOperations, (err, respBody, respInfo) => {
          if (err) {
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            resolve()
          }
          else if (respInfo.statusCode === 298) {
            reject(new Error('操作异常，但部分文件夹删除成功'))
          }
          else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
              ),
            )
          }
        })
      })
    }
    // 处理文件夹
    const dirs = fileList.filter(item => item.type === 'dir')
    if (dirs.length > 0) {
      // 处理文件夹的复制
      for (let i = 0; i < dirs.length; i++) {
        const dirName = `${dir}${dirs[i].name}/`
        const toDirName = `${toDir}${dirs[i].name}/`
        // 移动的目录不是是自己
        if (toDirName.startsWith(dirName))
          continue

        let hasFile = true
        let marker = ''
        while (hasFile) {
          await new Promise<void>((resolve, reject) => {
            // 列举当前目录下的所有文件
            this.bucketManager.listPrefix(
              this.qiniuConfig.bucket,
              {
                prefix: dirName,
                limit: NETDISK_HANDLE_MAX_ITEM,
                marker,
              },
              (err, respBody, respInfo) => {
                if (err) {
                  reject(err)
                  return
                }
                if (respInfo.statusCode === 200) {
                  const moveOperations = respBody.items.map((item) => {
                    const { key } = item
                    const destKey = key.replace(dirName, toDirName)
                    return qiniu.rs.moveOp(
                      this.qiniuConfig.bucket,
                      key,
                      this.qiniuConfig.bucket,
                      destKey,
                      op,
                    )
                  })
                  this.bucketManager.batch(
                    moveOperations,
                    (err2, respBody2, respInfo2) => {
                      if (err2) {
                        reject(err2)
                        return
                      }
                      if (respInfo2.statusCode === 200) {
                        if (isEmpty(respBody.marker))
                          hasFile = false
                        else
                          marker = respBody.marker

                        resolve()
                      }
                      else {
                        reject(
                          new Error(
                            `Qiniu Error Code: ${respInfo2.statusCode}, Info: ${respInfo2.statusMessage}`,
                          ),
                        )
                      }
                    },
                  )
                }
                else {
                  reject(
                    new Error(
                      `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`,
                    ),
                  )
                }
              },
            )
          })
        }
      }
    }
  }

  /**
   * 从URL中提取文件key、域名、协议与图片处理参数
   * @param imageUrl 图片URL，格式：http://domain/key?imageView2/2/w/500/h/210&e=expires&token=token
   * @returns {key: string, imageView?: string, domain?: string, protocol?: string}
   */
  private extractKeyFromUrl(imageUrl: string): {
    key: string
    imageView?: string
    domain?: string
    protocol?: string
  } {
    try {
      let key = ''
      let domain = ''
      let imageView: string | undefined
      let protocol: string | undefined

      try {
        const url = new URL(imageUrl)
        domain = url.host
        protocol = url.protocol.replace(':', '')
        key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname
        const search = url.search || ''
        if (search) {
          const match = search.match(/[?&](imageView2[^&]*)/)
          if (match)
            imageView = match[1]
        }
      }
      catch {
        // URL解析失败时使用正则兜底
        const urlMatch = imageUrl.match(/^(https?):\/\/([^/]+)\/([^?]+)(\?(.+))?$/)
        if (!urlMatch) {
          throw new Error('无法解析URL格式')
        }
        protocol = urlMatch[1] || ''
        domain = urlMatch[2] || ''
        key = urlMatch[3] || ''
        const queryString = urlMatch[5] || ''
        if (queryString) {
          const imageViewMatch = queryString.match(/(?:^|&)(imageView2[^&]*)/)
          if (imageViewMatch)
            imageView = imageViewMatch[1]
        }
      }

      if (!key) {
        throw new Error('文件key为空')
      }

      this.logger.debug(`从URL提取: key=${key}, imageView=${imageView}, domain=${domain}, protocol=${protocol}, url=${imageUrl}`)
      return { key, imageView, domain, protocol }
    }
    catch (error) {
      this.logger.error(`解析URL失败: url=${imageUrl}`, error)
      throw new Error(`无法从URL中提取文件key: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 代理图片请求，解决Mixed Content问题
   * 前端通过HTTPS访问后端代理接口，后端从HTTP的七牛云获取图片并返回
   * 如果遇到401错误（签名过期），会自动重新生成签名URL并重试
   * @param imageUrl 图片URL（HTTP协议）
   * @returns 图片的二进制数据流
   */
  async proxyImage(imageUrl: string): Promise<Buffer> {
    try {
      // 验证URL格式
      if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        throw new Error('图片URL格式不正确')
      }

      // 从七牛云获取图片
      try {
        const response = await firstValueFrom(
          this.httpService.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
          }),
        )

        return Buffer.from(response.data)
      }
      catch (error: any) {
        // 检查是否是401错误（签名过期）或其他可能的重试错误
        const statusCode = error?.response?.status || error?.status || error?.code
        const isUnauthorized = statusCode === 401
        const isNetworkError = error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND'

        // 如果是401错误（签名过期）或网络错误，尝试重新生成签名URL
        if (isUnauthorized || isNetworkError) {
          this.logger.warn(`图片请求失败 (status=${statusCode}), 尝试重新生成URL: url=${imageUrl}`)

          try {
            // 从URL中提取文件key和图片处理参数
            const { key, imageView, domain, protocol } = this.extractKeyFromUrl(imageUrl)
            this.logger.debug(`提取成功: key=${key}, imageView=${imageView || '无'}, domain=${domain || '无'}, protocol=${protocol || '无'}`)

            // 重新生成有效的预览链接
            const newImageUrl = this.getImagePreviewLink(key, imageView, domain, protocol)
            this.logger.debug(`重新生成的URL: ${newImageUrl}`)

            // 使用新URL重试请求
            const response = await firstValueFrom(
              this.httpService.get(newImageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
              }),
            )

            this.logger.debug(`使用重新生成的URL成功获取图片: key=${key}`)
            return Buffer.from(response.data)
          }
          catch (retryError: any) {
            const retryStatusCode = retryError?.response?.status || retryError?.status
            this.logger.error(
              `重新生成签名URL后仍然失败: url=${imageUrl}, retryStatus=${retryStatusCode}`,
              retryError,
            )
            throw new Error(
              `图片URL签名已过期，且重新生成失败: ${retryError instanceof Error ? retryError.message : '未知错误'}`,
            )
          }
        }

        // 其他错误直接抛出
        this.logger.error(`代理图片请求失败 (非401/网络错误): status=${statusCode}`, error)
        throw error
      }
    }
    catch (error) {
      this.logger.error(`代理图片请求失败: url=${imageUrl}`, error)
      throw error
    }
  }
}
