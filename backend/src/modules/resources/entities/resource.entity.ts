import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ResourceScope,
  ResourceStatus,
  ResourceType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';

/**
 * 共享资源：电子书/视频/音频/导学案/试题等。
 * 双层审核（校级审核 + 平台复核）、开放范围（仅本校/全平台共享）。
 */
@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'varchar', length: 32 })
  type: ResourceType;

  @Column({ type: 'varchar', length: 32 })
  subject: Subject;

  @Column({ type: 'varchar', length: 32 })
  stage: StudyStage;

  /** 关联知识点 id（自动标签匹配 + 人工确认） */
  @Column({ name: 'knowledge_points', type: 'simple-json' })
  knowledgePoints: string[];

  /** 存储 key（相对存储根目录） */
  @Column({ name: 'file_key', type: 'varchar', length: 255 })
  fileKey: string;

  /** 文件体积（字节），强制轻量化压缩 */
  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  /** 扩展名，如 .mp4/.pdf/.mp3 */
  @Column({ type: 'varchar', length: 16 })
  format: string;

  @Column({ name: 'owner_id', type: 'varchar', length: 64 })
  ownerId: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64, nullable: true })
  schoolId: string;

  @Column({ type: 'varchar', length: 32, default: ResourceScope.SCHOOL_ONLY })
  scope: ResourceScope;

  @Column({ type: 'varchar', length: 32, default: ResourceStatus.PENDING_SCHOOL })
  status: ResourceStatus;

  @Column({ type: 'int', default: 0 })
  downloads: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}