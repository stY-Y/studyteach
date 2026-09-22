import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 升学数据：招生政策 / 投档线 / 选科要求（每年同步更新，保障时效性） */
@Entity('enrollment_policies')
export class EnrollmentPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  region: string;

  /** policy(招生政策) / score_line(投档线) / subject_requirement(选科要求) */
  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}