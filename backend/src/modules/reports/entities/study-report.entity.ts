import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Subject } from '@teachstudy/shared';

/** 极简版学情报表（降低乡村教师解读数据门槛） */
@Entity('study_reports')
export class StudyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'varchar', length: 32 })
  subject: Subject;

  /** 极简指标：诊断次数/练习量/薄弱点/平均分 */
  @Column({ type: 'simple-json' })
  metrics: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}