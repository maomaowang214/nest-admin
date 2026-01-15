import { Injectable } from '@nestjs/common'
import Redis from 'ioredis'

import { throttle } from 'lodash'
import { UAParser } from 'ua-parser-js'

import { InjectRedis } from '~/common/decorators/inject-redis.decorator'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'
import { genOnlineUserKey } from '~/helper/genRedisKey'
import { AuthService } from '~/modules/auth/auth.service'
import { AccessTokenEntity } from '~/modules/auth/entities/access-token.entity'
import { TokenService } from '~/modules/auth/services/token.service'
import { SseService } from '~/modules/sse/sse.service'
import { getIpAddress } from '~/utils'

import { UserService } from '../../user/user.service'

import { OnlineUserInfo } from './online.model'

/**
 * 在线用户服务
 * 负责管理在线用户信息，包括添加、移除、查询和踢下线功能
 */
@Injectable()
export class OnlineService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly sseService: SseService,
  ) {}

  /**
   * 在线用户数量变动时，通知前端实时更新
   * 使用节流函数，3秒内最多推送一次，避免频繁触发
   */
  private readonly updateOnlineUserCount = throttle(async () => {
    try {
    const keys = await this.redis.keys(genOnlineUserKey('*'))
      await this.sseService.sendToAllUser({
        type: 'updateOnlineUserCount',
        data: keys.length,
      })
    }
    catch (error) {
      // 静默处理 SSE 推送失败，不影响主流程
      console.error('Failed to update online user count:', error)
    }
  }, 3000)

  /**
   * 添加在线用户
   * @param tokenValue - 访问令牌值
   * @param ip - 用户IP地址
   * @param ua - 用户代理字符串
   */
  async addOnlineUser(tokenValue: string, ip: string, ua: string): Promise<void> {
    const token = await this.findTokenWithUser(tokenValue)
    if (!token) {
      return
    }

    const tokenPayload = await this.tokenService.verifyAccessToken(tokenValue)
    const expirationTime = Math.floor(tokenPayload.exp - Date.now() / 1000)

    if (expirationTime <= 0) {
      return
    }

    const userInfo = await this.buildUserInfo(token, ip, ua)
    const redisKey = genOnlineUserKey(token.id)

    await this.redis.set(redisKey, JSON.stringify(userInfo), 'EX', expirationTime)
    this.updateOnlineUserCount()
  }

  /**
   * 移除在线用户
   * @param tokenValue - 访问令牌值
   */
  async removeOnlineUser(tokenValue: string): Promise<void> {
    const token = await this.findToken(tokenValue)
    if (!token) {
      return
    }

    const redisKey = genOnlineUserKey(token.id)
    await this.redis.del(redisKey)
    this.updateOnlineUserCount()
  }

  /**
   * 移除所有在线用户
   */
  async clearAllOnlineUsers(): Promise<void> {
    const keys = await this.redis.keys(genOnlineUserKey('*'))
    if (keys.length > 0) {
      await this.redis.del(...keys)
      this.updateOnlineUserCount()
    }
  }

  /**
   * 获取在线用户列表
   * @param currentTokenValue - 当前用户的访问令牌值
   * @returns 在线用户信息列表
   */
  async getOnlineUserList(currentTokenValue: string): Promise<OnlineUserInfo[]> {
    const currentToken = await this.findToken(currentTokenValue)
    const rootUserId = await this.userService.findRootUserId()

    const keys = await this.redis.keys(genOnlineUserKey('*'))
    if (keys.length === 0) {
      return []
    }

    const userDataList = await this.redis.mget(keys)
    const onlineUsers = this.parseUserDataList(userDataList, currentToken?.id, rootUserId)

    return this.sortByLoginTime(onlineUsers)
  }

  /**
   * 踢下线指定用户
   * @param tokenId - 要踢下线的用户令牌ID
   * @param currentUser - 当前操作用户信息
   */
  async kickUser(tokenId: string, currentUser: IAuthUser): Promise<void> {
    const targetToken = await AccessTokenEntity.findOne({
      where: { id: tokenId },
      relations: ['user'],
      cache: true,
    })

    if (!targetToken) {
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)
    }

    const rootUserId = await this.userService.findRootUserId()
    const targetUserId = targetToken.user.id

    // 不允许踢下线超级管理员
    if (rootUserId !== null && targetUserId === rootUserId) {
      throw new BusinessException(ErrorEnum.NOT_ALLOWED_TO_LOGOUT_USER)
    }

    // 不允许踢下线自己
    if (targetUserId === currentUser.uid) {
      throw new BusinessException(ErrorEnum.NOT_ALLOWED_TO_LOGOUT_USER)
    }

    const targetUserPayload = await this.tokenService.verifyAccessToken(targetToken.value)
    await this.authService.clearLoginStatus(targetUserPayload, targetToken.value)
  }

  /**
   * 查找访问令牌（包含用户信息）
   */
  private async findTokenWithUser(tokenValue: string): Promise<AccessTokenEntity | null> {
    return AccessTokenEntity.findOne({
      where: { value: tokenValue },
      relations: {
        user: {
          dept: true,
        },
      },
      cache: true,
    })
  }

  /**
   * 查找访问令牌
   */
  private async findToken(tokenValue: string): Promise<AccessTokenEntity | null> {
    return AccessTokenEntity.findOne({
      where: { value: tokenValue },
      relations: ['user'],
      cache: true,
    })
  }

  /**
   * 构建用户信息对象
   */
  private async buildUserInfo(
    token: AccessTokenEntity,
    ip: string,
    ua: string,
  ): Promise<OnlineUserInfo> {
    const parser = new UAParser(ua)
    const uaResult = parser.getResult()
    const address = await getIpAddress(ip)

    return {
      ip,
      address,
      tokenId: token.id,
      uid: token.user.id,
      deptName: token.user.dept?.name ?? '',
      os: this.formatOS(uaResult.os),
      browser: this.formatBrowser(uaResult.browser),
      username: token.user.username,
      time: token.created_at.toString(),
    }
  }

  /**
   * 格式化操作系统信息
   */
  private formatOS(os: UAParser.IOS): string {
    const name = os.name ?? ''
    const version = os.version ?? ''
    return name && version ? `${name} ${version}` : name || version || '未知'
  }

  /**
   * 格式化浏览器信息
   */
  private formatBrowser(browser: UAParser.IBrowser): string {
    const name = browser.name ?? ''
    const version = browser.version ?? ''
    return name && version ? `${name} ${version}` : name || version || '未知'
  }

  /**
   * 解析用户数据列表
   */
  private parseUserDataList(
    userDataList: (string | null)[],
    currentTokenId: string | undefined,
    rootUserId: string | null,
  ): OnlineUserInfo[] {
    return userDataList
      .filter((data): data is string => data !== null && data !== undefined)
      .map((data) => {
        try {
          const userInfo = JSON.parse(data) as OnlineUserInfo
          userInfo.isCurrent = currentTokenId === userInfo.tokenId
          userInfo.disable = userInfo.isCurrent || (rootUserId !== null && userInfo.uid === rootUserId)
          return userInfo
        }
        catch (error) {
          console.error('Failed to parse user data:', error)
          return null
        }
      })
      .filter((userInfo): userInfo is OnlineUserInfo => userInfo !== null)
  }

  /**
   * 按登录时间排序（最新的在前）
   */
  private sortByLoginTime(users: OnlineUserInfo[]): OnlineUserInfo[] {
    return users.sort((a, b) => {
      const timeA = new Date(a.time).getTime()
      const timeB = new Date(b.time).getTime()
      return timeB - timeA
    })
  }
}
