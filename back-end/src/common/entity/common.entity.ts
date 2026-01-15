import { ApiHideProperty, ApiProperty } from '@nestjs/swagger'
import { Exclude } from 'class-transformer'
import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm'

import { generateSnowflakeId } from '~/utils'

export abstract class CommonEntity extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 19, comment: '主键ID（雪花ID）' })
  id: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @BeforeInsert()
  generateId() {
    if (!this.id)
      this.id = generateSnowflakeId()
  }
}

export abstract class CompleteEntity extends CommonEntity {
  @ApiHideProperty()
  @Exclude()
  @Column({ name: 'create_by', type: 'varchar', length: 19, update: false, comment: '创建者', nullable: true })
  createBy: string | null

  @ApiHideProperty()
  @Exclude()
  @Column({ name: 'update_by', type: 'varchar', length: 19, comment: '更新者', nullable: true })
  updateBy: string | null

  @ApiProperty({ description: '创建者' })
  @VirtualColumn({ query: alias => `SELECT username FROM sys_user WHERE id = ${alias}.create_by` })
  creator: string

  @ApiProperty({ description: '更新者' })
  @VirtualColumn({ query: alias => `SELECT username FROM sys_user WHERE id = ${alias}.update_by` })
  updater: string
}
