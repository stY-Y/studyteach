import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';

/**
 * 题目：每道题标注「考查知识点、难度层级、能力要求、典型错因」，绑定知识图谱。
 */
@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  subject: Subject;

  @Column({ type: 'varchar', length: 32 })
  stage: StudyStage;

  @Column({ type: 'varchar', length: 32 })
  type: QuestionType;

  @Column({ type: 'varchar', length: 32 })
  difficulty: DifficultyLevel;

  /** 能力要求（布鲁姆层次） */
  @Column({ type: 'varchar', length: 32 })
  ability: AbilityRequirement;

  /** 关联知识点 id 列表（绑定知识图谱） */
  @Column({ name: 'knowledge_points', type: 'simple-json' })
  knowledgePoints: string[];

  /** 题干 */
  @Column({ type: 'text' })
  content: string;

  /** 选项（选择题） */
  @Column({ type: 'simple-json', nullable: true })
  options: string[];

  /** 参考答案 */
  @Column({ type: 'text', nullable: true })
  answer: string;

  /** 解析 */
  @Column({ type: 'text', nullable: true })
  analysis: string;

  /** 典型错因 */
  @Column({ name: 'typical_errors', type: 'simple-json', nullable: true })
  typicalErrors: string[];

  /** 来源（公开授权/原创公益） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  source: string;

  /** pending / approved / rejected */
  @Column({ type: 'varchar', length: 32, default: 'approved' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}