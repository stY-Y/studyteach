import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 智能批改记录：错因分析 + 启发式点拨（不输出完整答案） */
@Entity('grading_records')
export class GradingRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'varchar', length: 64 })
  studentId: string;

  @Column({ name: 'question_id', type: 'varchar', length: 64 })
  questionId: string;

  @Column({ type: 'text' })
  answer: string;

  /** 归一化得分 0-1 */
  @Column({ type: 'float' })
  score: number;

  @Column({ name: 'error_analysis', type: 'text', nullable: true })
  errorAnalysis: string;

  /** 启发式思路点拨 */
  @Column({ type: 'simple-json', nullable: true })
  hints: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}