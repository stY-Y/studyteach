import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 指令通知（自上而下）：
 *  - 学校管理员 → 年级管理员（gradeId）
 *  - 年级管理员 → 班主任（classId）
 *  - 班主任 → 学生：走班级聊天，不落本表
 */
@Entity('notices')
@Index(['schoolId', 'toRole', 'createdAt'])
export class Notice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64 })
  schoolId: string;

  @Column({ name: 'grade_id', type: 'varchar', length: 64, nullable: true })
  gradeId: string | null;

  @Column({ name: 'class_id', type: 'varchar', length: 64, nullable: true })
  classId: string | null;

  @Column({ name: 'from_user_id', type: 'varchar', length: 64 })
  fromUserId: string;

  @Column({ name: 'from_role', type: 'varchar', length: 32 })
  fromRole: string;

  @Column({ name: 'from_name', type: 'varchar', length: 64, nullable: true })
  fromName: string | null;

  /** grade_admin / teacher */
  @Column({ name: 'to_role', type: 'varchar', length: 32 })
  toRole: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
