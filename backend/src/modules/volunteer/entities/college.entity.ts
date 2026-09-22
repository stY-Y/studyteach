import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 院校库：名称/地区/类型/选科要求/报考限制（每年同步更新） */
@Entity('colleges')
export class College {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  region: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  type: string;

  @Column({ type: 'simple-json', nullable: true })
  majors: string[];

  /** 最低录取位次（参考） */
  @Column({ name: 'min_rank', type: 'int', nullable: true })
  minRank: number;

  /** 报考限制条件 */
  @Column({ type: 'simple-json', nullable: true })
  requirements: string[];

  @Column({ type: 'int', default: 2024 })
  year: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}