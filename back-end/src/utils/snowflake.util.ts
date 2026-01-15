/**
 * 雪花ID生成器
 * 基于Twitter的雪花算法实现
 * 
 * ID结构：64位
 * - 1位符号位（始终为0）
 * - 41位时间戳（毫秒级，可使用69年）
 * - 10位机器ID（5位数据中心ID + 5位机器ID，最多1024个节点）
 * - 12位序列号（每毫秒最多4096个ID）
 */
export class Snowflake {
  // 起始时间戳：2024-01-01 00:00:00
  private readonly twepoch = 1704067200000n

  // 机器ID位数
  private readonly workerIdBits = 5n
  // 数据中心ID位数
  private readonly datacenterIdBits = 5n
  // 序列号位数
  private readonly sequenceBits = 12n

  // 机器ID最大值
  private readonly maxWorkerId = -1n ^ (-1n << this.workerIdBits)
  // 数据中心ID最大值
  private readonly maxDatacenterId = -1n ^ (-1n << this.datacenterIdBits)

  // 机器ID左移位数
  private readonly workerIdShift = this.sequenceBits
  // 数据中心ID左移位数
  private readonly datacenterIdShift = this.sequenceBits + this.workerIdBits
  // 时间戳左移位数
  private readonly timestampLeftShift = this.sequenceBits + this.workerIdBits + this.datacenterIdBits

  // 序列号掩码
  private readonly sequenceMask = -1n ^ (-1n << this.sequenceBits)

  private workerId: bigint
  private datacenterId: bigint
  private sequence: bigint = 0n
  private lastTimestamp: bigint = -1n

  constructor(workerId: number = 1, datacenterId: number = 1) {
    if (workerId > Number(this.maxWorkerId) || workerId < 0)
      throw new Error(`workerId must be between 0 and ${this.maxWorkerId}`)

    if (datacenterId > Number(this.maxDatacenterId) || datacenterId < 0)
      throw new Error(`datacenterId must be between 0 and ${this.maxDatacenterId}`)

    this.workerId = BigInt(workerId)
    this.datacenterId = BigInt(datacenterId)
  }

  /**
   * 生成下一个ID
   */
  nextId(): string {
    let timestamp = this.currentTimestamp()

    // 如果当前时间小于上一次ID生成的时间戳，说明系统时钟回退过，抛出异常
    if (timestamp < this.lastTimestamp) {
      throw new Error(
        `Clock moved backwards. Refusing to generate id for ${this.lastTimestamp - timestamp} milliseconds`,
      )
    }

    // 如果是同一时间生成的，则进行毫秒内序列
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.sequenceMask
      // 毫秒内序列溢出
      if (this.sequence === 0n) {
        // 阻塞到下一个毫秒，获得新的时间戳
        timestamp = this.tilNextMillis(this.lastTimestamp)
      }
    }
    else {
      // 时间戳改变，毫秒内序列重置
      this.sequence = 0n
    }

    // 上次生成ID的时间戳
    this.lastTimestamp = timestamp

    // 移位并通过或运算拼到一起组成64位的ID
    const id
      = ((timestamp - this.twepoch) << this.timestampLeftShift)
      | (this.datacenterId << this.datacenterIdShift)
      | (this.workerId << this.workerIdShift)
      | this.sequence

    return id.toString()
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  private currentTimestamp(): bigint {
    return BigInt(Date.now())
  }

  /**
   * 阻塞到下一个毫秒，直到获得新的时间戳
   */
  private tilNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.currentTimestamp()
    while (timestamp <= lastTimestamp)
      timestamp = this.currentTimestamp()

    return timestamp
  }
}

// 单例实例
let snowflakeInstance: Snowflake | null = null

/**
 * 获取雪花ID生成器实例（单例模式）
 */
export function getSnowflake(workerId?: number, datacenterId?: number): Snowflake {
  if (!snowflakeInstance) {
    // 从环境变量读取配置，如果没有则使用默认值
    const wId = workerId ?? Number.parseInt(process.env.SNOWFLAKE_WORKER_ID || '1')
    const dId = datacenterId ?? Number.parseInt(process.env.SNOWFLAKE_DATACENTER_ID || '1')
    snowflakeInstance = new Snowflake(wId, dId)
  }
  return snowflakeInstance
}

/**
 * 生成雪花ID（便捷方法）
 */
export function generateSnowflakeId(): string {
  return getSnowflake().nextId()
}
