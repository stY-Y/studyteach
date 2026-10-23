import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '@teachstudy/shared';

/** 四端统一账号（学生/教师/管理员/家长共用一张用户表） */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 32, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ type: 'varchar', length: 64, nullable: true })
  name: string;

  /** 手机号密文（AES-256-GCM，随机 IV，可解密还原） */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  phone: string | null;

  /**
   * 手机号盲索引：HMAC-SHA256(规范化手机号)，不可逆。
   * 用于「唯一约束 + 精确查找」——加密列带随机 IV 无法做等值查询。
   */
  @Column({ name: 'phone_hash', type: 'varchar', length: 64, unique: true, nullable: true })
  phoneHash: string | null;

  @Column({ name: 'school_id', type: 'varchar', length: 64, nullable: true })
  schoolId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}