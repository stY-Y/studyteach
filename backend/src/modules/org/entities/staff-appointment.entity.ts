import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { StaffRole } from '@teachstudy/shared';

/**
 * 岗位任命记录：管理员体系的唯一权威来源。
 *
 * 设计要点：
 * - 所有下级管理员（学校/年级/班级）都是「任命」产生，注册不产生任何岗位；
 * - 同一个人可以有多条记录（年级管理员兼任班级管理员）；
 * - scopeId 是岗位的作用范围（学校 id / 年级 id / 班级 id），配合 userId+role 唯一，
 *   天然防止重复任命；名额上限由服务层按 scopeId 计数校验。
 */
@Entity('staff_appointments')
@Index(['userId', 'role', 'scopeId'], { unique: true })
export class StaffAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  role: StaffRole;

  /** 作用范围：学校管理员=学校 id，年级管理员=年级 id，班级管理员=班级 id */
  @Column({ name: 'scope_id', type: 'varchar', length: 64 })
  scopeId: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64 })
  schoolId: string;

  @Column({ name: 'grade_id', type: 'varchar', length: 64, nullable: true })
  gradeId: string | null;

  @Column({ name: 'class_id', type: 'varchar', length: 64, nullable: true })
  classId: string | null;

  /** 任命人（上级管理员）的用户 id */
  @Column({ name: 'appointed_by', type: 'varchar', length: 64, nullable: true })
  appointedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
