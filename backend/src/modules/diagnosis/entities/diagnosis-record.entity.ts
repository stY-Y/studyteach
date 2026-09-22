import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiagnosisStatus, StudyStage, Subject } from '@teachstudy/shared';
import { WeakPointResult } from '../../../ai/providers/ai-provider.interface';

/** 知识诊断记录：10-15 题检测 -> 薄弱点清单 + 补漏学习路径 */
@Entity('diagnosis_records')
export class DiagnosisRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'varchar', length: 32 })
  subject: Subject;

  /** 学段（诊断必须限定学段，避免跨学段混题） */
  @Column({ type: 'varchar', length: 32, nullable: true })
  stage: StudyStage;

  /** 检测题覆盖的知识点 id */
  @Column({ type: 'simple-json', nullable: true })
  coverage: string[];

  @Column({ name: 'question_ids', type: 'simple-json' })
  questionIds: string[];

  @Column({ type: 'varchar', length: 32, default: DiagnosisStatus.PENDING })
  status: DiagnosisStatus;

  /** 学生作答（提交后落库，用于回看逐题解析） */
  @Column({ type: 'simple-json', nullable: true })
  answers: Array<{ questionId: string; answer: string }>;

  /** 薄弱点清单 */
  @Column({ name: 'weak_points', type: 'simple-json', nullable: true })
  weakPoints: WeakPointResult[];

  /** 个性化补漏学习路径 */
  @Column({ name: 'learning_path', type: 'simple-json', nullable: true })
  learningPath: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}