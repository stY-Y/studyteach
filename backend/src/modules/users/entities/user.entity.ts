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

  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  phone: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64, nullable: true })
  schoolId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}