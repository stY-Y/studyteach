import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { VolunteerCollege } from '../../../ai/providers/ai-provider.interface';

/** 志愿方案：按分数/位次/选科生成「冲稳保」梯度 */
@Entity('volunteer_plans')
export class VolunteerPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'float' })
  score: number;

  @Column({ type: 'int' })
  rank: number;

  @Column({ type: 'simple-json' })
  subjects: string[];

  /** 冲稳保方案（含报考限制） */
  @Column({ type: 'simple-json' })
  plans: VolunteerCollege[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}