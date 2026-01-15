import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { LessThan, Repository } from 'typeorm'
import { UAParser } from 'ua-parser-js'

import { paginateRaw } from '~/helper/paginate'
import { getIpAddress } from '~/utils/ip.util'

import { LoginLogQueryDto } from '../dto/log.dto'
import { LoginLogEntity } from '../entities/login-log.entity'
import { LoginLogInfo } from '../models/log.model'

/**
 * 登录日志服务
 * 负责管理用户登录日志的创建、查询和清理
 */
@Injectable()
export class LoginLogService {
  private readonly logger = new Logger(LoginLogService.name)

  constructor(
    @InjectRepository(LoginLogEntity)
    private readonly loginLogRepository: Repository<LoginLogEntity>,
  ) {}

  /**
   * 创建登录日志
   * @param uid - 用户ID
   * @param ip - 登录IP地址
   * @param ua - 用户代理字符串
   */
  async create(uid: string, ip: string, ua: string): Promise<void> {
    try {
      const address = await this.getIpAddress(ip)

      // 显式创建实体实例，确保 @BeforeInsert() 钩子能够正确触发
      const log = this.loginLogRepository.create({
        ip,
        ua,
        address,
        user: { id: uid },
      })

      const savedLog = await this.loginLogRepository.save(log)

      this.logger.debug(`登录日志已创建: userId=${uid}, ip=${ip}, logId=${savedLog.id}`)
    }
    catch (error) {
      // 登录日志创建失败不应影响登录流程
      this.logger.error(`创建登录日志失败: userId=${uid}, ip=${ip}`, error)
    }
  }

  /**
   * 查询登录日志列表
   * @param dto - 查询条件
   * @returns 分页的登录日志列表
   */
  async list(dto: LoginLogQueryDto) {
    const queryBuilder = this.buildQueryBuilder(dto)

    const paginationResult = await paginateRaw<LoginLogEntity>(queryBuilder, {
      page: dto.page,
      pageSize: dto.pageSize,
    })

    const loginLogInfos = this.parseLoginLogs(paginationResult.items)

    return {
      items: loginLogInfos,
      meta: paginationResult.meta,
    }
  }

  /**
   * 清空所有登录日志
   */
  async clearAll(): Promise<void> {
    await this.loginLogRepository.clear()
    this.logger.log('已清空所有登录日志')
  }

  /**
   * 删除指定时间之前的登录日志
   * @param time - 截止时间
   */
  async clearBeforeTime(time: Date): Promise<void> {
    const result = await this.loginLogRepository.delete({ createdAt: LessThan(time) })
    this.logger.log(`已删除 ${result.affected || 0} 条登录日志`)
  }

  /**
   * 构建查询构建器
   */
  private buildQueryBuilder(dto: LoginLogQueryDto) {
    const queryBuilder = this.loginLogRepository
      .createQueryBuilder('login_log')
      .innerJoin('login_log.user', 'user')
      .addSelect([
        'login_log.id',
        'login_log.ip',
        'login_log.address',
        'login_log.ua',
        'login_log.created_at',
        'user.username',
      ])
      .orderBy('login_log.created_at', 'DESC')

    // 添加查询条件
    this.applySearchConditions(queryBuilder, dto)

    return queryBuilder
  }

  /**
   * 应用搜索条件
   */
  private applySearchConditions(
    queryBuilder: ReturnType<typeof this.buildQueryBuilder>,
    dto: LoginLogQueryDto,
  ) {
    if (dto.ip) {
      queryBuilder.andWhere('login_log.ip LIKE :ip', { ip: `%${dto.ip}%` })
    }

    if (dto.address) {
      queryBuilder.andWhere('login_log.address LIKE :address', { address: `%${dto.address}%` })
    }

    if (dto.time && dto.time.length === 2) {
      queryBuilder.andWhere('login_log.created_at BETWEEN :startTime AND :endTime', {
        startTime: dto.time[0],
        endTime: dto.time[1],
      })
    }

    if (dto.username) {
      queryBuilder.andWhere('user.username LIKE :username', { username: `%${dto.username}%` })
    }
  }

  /**
   * 解析登录日志数据
   */
  private parseLoginLogs(rawItems: any[]): LoginLogInfo[] {
    const parser = new UAParser()

    return rawItems.map(item => this.parseLoginLog(item, parser))
  }

  /**
   * 解析单条登录日志
   */
  private parseLoginLog(rawItem: any, parser: UAParser): LoginLogInfo {
    const uaResult = parser.setUA(rawItem.login_log_ua).getResult()

    return {
      id: rawItem.login_log_id,
      ip: rawItem.login_log_ip,
      address: rawItem.login_log_address || '未知',
      os: this.formatOS(uaResult.os),
      browser: this.formatBrowser(uaResult.browser),
      username: rawItem.user_username,
      time: rawItem.login_log_created_at,
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
   * 获取IP地址的地理位置信息
   */
  private async getIpAddress(ip: string): Promise<string> {
    try {
      return await getIpAddress(ip)
    }
    catch (error) {
      this.logger.warn(`获取IP地址失败: ${ip}`, error)
      return '未知'
    }
  }
}
