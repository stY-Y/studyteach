import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 班级：由教师创建，学生申请、教师审核通过后才能使用班级聊天与作业。
 */
@Entity('class_rooms')
@Index(['schoolId', 'grade', 'className'])
export class ClassRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64 })
  schoolId: string;

  /** 所属年级 id（年级管理维度） */
  @Column({ name: 'grade_id', type: 'varchar', length: 64, nullable: true })
  gradeId: string | null;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  @Column({ name: 'class_name', type: 'varchar', length: 64 })
  className: string;

  /** 展示名，默认「年级 + 班级名」 */
  @Column({ type: 'varchar', length: 64 })
  name: string;

  /** 创建班级的教师 */
  @Column({ name: 'teacher_id', type: 'varchar', length: 64 })
  teacherId: string;

  @Column({ name: 'teacher_name', type: 'varchar', length: 64, nullable: true })
  teacherName: string | null;

  /** 邀请码：学生可凭码直接申请加入 */
  @Column({ name: 'invite_code', type: 'varchar', length: 12, unique: true })
  inviteCode: string;

  /** active / archived */
  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
