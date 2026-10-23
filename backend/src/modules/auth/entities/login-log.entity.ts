import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 登录日志（日活统计的数据源）。
 *
 * 只记录「谁在什么时间登录了」，不记录 IP、设备、UA 等任何可用于定位个人的信息——
 * 乡村孩子的数据越少留存越好，能支撑「今天有多少人用」就够了。
 *
 * 日活口径：按自然日去重统计 user_id（同一人一天登录多次只算 1 人）。
 */
@Entity('login_logs')
@Index('idx_login_logs_user', ['userId'])
@Index('idx_login_logs_day', ['createdAt'])
export class LoginLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;

  /** 登录时的角色快照（角色会随任命变动，统计按当时角色归档） */
  @Column({ type: 'varchar', length: 32 })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
