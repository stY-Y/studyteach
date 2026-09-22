import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DifficultyLevel, StudyStage, Subject } from '@teachstudy/shared';
import { PaperBlueprintItem } from '../../../ai/providers/ai-provider.interface';

/** 组卷结果统计：请求题量 / 实际题量 / 缺口明细 */
export interface PaperMeta {
  requested: number;
  actual: number;
  shortages: Array<{
    knowledgePointId: string;
    requested: number;
    actual: number;
  }>;
}

/** 智能组卷生成的试卷 */
@Entity('papers')
export class Paper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'varchar', length: 32 })
  subject: Subject;

  /** 学段（组卷必须限定学段，避免跨学段混题） */
  @Column({ type: 'varchar', length: 32, nullable: true })
  stage: StudyStage;

  @Column({ name: 'knowledge_points', type: 'simple-json' })
  knowledgePoints: string[];

  @Column({ type: 'varchar', length: 32 })
  difficulty: DifficultyLevel;

  /** 请求题量 */
  @Column({ type: 'int' })
  count: number;

  /** 最终入选题目 id（按选题计划顺序） */
  @Column({ name: 'question_ids', type: 'simple-json' })
  questionIds: string[];

  /** AI 选题计划（考什么/什么题型/多难/几道） */
  @Column({ type: 'simple-json', nullable: true })
  blueprint: PaperBlueprintItem[];

  /** AI 组卷说明 */
  @Column({ type: 'text', nullable: true })
  summary: string;

  /** 组卷结果统计（是否因题库不足出现缺口） */
  @Column({ type: 'simple-json', nullable: true })
  meta: PaperMeta;

  @Column({ name: 'creator_id', type: 'varchar', length: 64 })
  creatorId: string;

  @Column({ type: 'varchar', length: 32, default: 'generated' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}