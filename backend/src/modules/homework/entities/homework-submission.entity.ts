import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 学生作业提交（同一作业每人仅一条，重复提交覆盖） */
@Entity('homework_submissions')
@Index(['homeworkId', 'studentId'], { unique: true })
export class HomeworkSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'homework_id', type: 'varchar', length: 64 })
  homeworkId: string;

  @Column({ name: 'student_id', type: 'varchar', length: 64 })
  studentId: string;

  @Column({ name: 'student_name', type: 'varchar', length: 64, nullable: true })
  studentName: string | null;

  /** 题号键 -> 学生作答 */
  @Column({ type: 'simple-json' })
  answers: Record<string, string>;

  /** 客观题自动判分（0-100）；无客观题时为 null */
  @Column({ type: 'int', nullable: true })
  score: number | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;
}
