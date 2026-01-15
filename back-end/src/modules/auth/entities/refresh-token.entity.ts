import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm'

import { generateSnowflakeId } from '~/utils'

import { AccessTokenEntity } from './access-token.entity'

@Entity('user_refresh_tokens')
export class RefreshTokenEntity extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 19, comment: '主键ID（雪花ID）' })
  id!: string

  @BeforeInsert()
  generateId() {
    if (!this.id)
      this.id = generateSnowflakeId()
  }

  @Column({ length: 500 })
  value!: string

  @Column({ comment: '令牌过期时间' })
  expired_at!: Date

  @CreateDateColumn({ comment: '令牌创建时间' })
  created_at!: Date

  @OneToOne(() => AccessTokenEntity, accessToken => accessToken.refreshToken, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  accessToken!: AccessTokenEntity
}
