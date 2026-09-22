import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StudyStage, Subject } from '@teachstudy/shared';

/** 知识点（全学段结构化知识图谱，题目/资源均关联知识点） */
@Entity('knowledge_points')
export class KnowledgePoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 唯一编码，如 MATH-7-01 */
  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  subject: Subject;

  @Column({ type: 'varchar', length: 32, nullable: true })
  stage: StudyStage;

  @Column({ name: 'parent_id', type: 'varchar', length: 64, nullable: true })
  parentId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}