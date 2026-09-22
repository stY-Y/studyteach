import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ReviewLevel, ReviewResult } from '@teachstudy/shared';

/** 审核记录：校级审核 + 平台复核 双层机制 */
@Entity('review_records')
export class ReviewRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 64 })
  resourceId: string;

  @Column({ type: 'varchar', length: 16 })
  level: ReviewLevel;

  @Column({ name: 'reviewer_id', type: 'varchar', length: 64 })
  reviewerId: string;

  @Column({ type: 'varchar', length: 16 })
  result: ReviewResult;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}