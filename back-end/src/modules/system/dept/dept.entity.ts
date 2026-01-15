import { ApiHideProperty, ApiProperty } from '@nestjs/swagger'
import {
  Column,
  Entity,
  OneToMany,
  Relation,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm'

import { CompleteEntity } from '~/common/entity/common.entity'

import { UserEntity } from '../../user/user.entity'

@Entity({ name: 'sys_dept' })
@Tree('materialized-path')
export class DeptEntity extends CompleteEntity {
  @Column()
  @ApiProperty({ description: '部门名称' })
  name: string

  @Column({ nullable: true, default: 0 })
  @ApiProperty({ description: '排序' })
  orderNo: number

  @TreeChildren({ cascade: true })
  children: DeptEntity[]

  @Column({
    name: 'parentId',
    type: 'varchar',
    length: 19,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_general_ci',
  })
  parentId: string | null

  @TreeParent({ onDelete: 'SET NULL' })
  parent?: DeptEntity

  @ApiHideProperty()
  @OneToMany(() => UserEntity, user => user.dept)
  users: Relation<UserEntity[]>
}
