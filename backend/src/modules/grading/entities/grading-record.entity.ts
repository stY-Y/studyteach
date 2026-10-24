import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { GradeKeyPoint } from '../../../ai/providers/ai-provider.interface';

/**
 * 智能批改记录。
 *
 * 提示采用「脚手架」结构：每个关键点配一组逐层递进的提示（点拨 → 一小段答案 → 再点拨 → …），
 * 学生要到底才给完整答案与解析。既留出自己想的空间，也不把人堵死在无解处。
 */
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

  /** 启发式思路点拨（每个关键点的第一句） */
  @Column({ type: 'simple-json', nullable: true })
  hints: string[];

  /** 解题关键点 + 逐层递进的提示（脚手架） */
  @Column({ name: 'key_points', type: 'simple-json', nullable: true })
  keyPoints: GradeKeyPoint[];

  /** 完整答案：学生一层层要到底才会被展示，仍需留存以便回放记录 */
  @Column({ name: 'full_answer', type: 'text', nullable: true })
  fullAnswer: string;

  /** 完整解析 */
  @Column({ type: 'text', nullable: true })
  analysis: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}