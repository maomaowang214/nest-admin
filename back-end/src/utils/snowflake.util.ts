/**
 * 雪花ID生成器
 * 基于Twitter的雪花算法实现
 */
export class Snowflake {
  private readonly twepoch = 1704067200000n
  private readonly workerIdBits = 5n
  private readonly datacenterIdBits = 5n
  private readonly sequenceBits = 12n
  private readonly maxWorkerId = -1n ^ (-1n << this.workerIdBits)
  private readonly maxDatacenterId = -1n ^ (-1n << this.datacenterIdBits)
  private readonly workerIdShift = this.sequenceBits
  private readonly datacenterIdShift = this.sequenceBits + this.workerIdBits
  private readonly timestampLeftShift = this.sequenceBits + this.workerIdBits + this.datacenterIdBits
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

  nextId(): string {
    let timestamp = this.currentTimestamp()

    if (timestamp < this.lastTimestamp) {
      throw new Error(
        `Clock moved backwards. Refusing to generate id for ${this.lastTimestamp - timestamp} milliseconds`,
      )
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.sequenceMask
      if (this.sequence === 0n) {
        timestamp = this.tilNextMillis(this.lastTimestamp)
      }
    }
    else {
      this.sequence = 0n
    }

    this.lastTimestamp = timestamp

    const id
      = ((timestamp - this.twepoch) << this.timestampLeftShift)
      | (this.datacenterId << this.datacenterIdShift)
      | (this.workerId << this.workerIdShift)
      | this.sequence

    return id.toString()
  }

  private currentTimestamp(): bigint {
    return BigInt(Date.now())
  }

  private tilNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.currentTimestamp()
    while (timestamp <= lastTimestamp)
      timestamp = this.currentTimestamp()

    return timestamp
  }
}

let snowflakeInstance: Snowflake | null = null

export function getSnowflake(workerId?: number, datacenterId?: number): Snowflake {
  if (!snowflakeInstance) {
    const wId = workerId ?? Number.parseInt(process.env.SNOWFLAKE_WORKER_ID || '1')
    const dId = datacenterId ?? Number.parseInt(process.env.SNOWFLAKE_DATACENTER_ID || '1')
    snowflakeInstance = new Snowflake(wId, dId)
  }
  return snowflakeInstance
}

export function generateSnowflakeId(): string {
  return getSnowflake().nextId()
}
