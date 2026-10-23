import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 年级（隶属于学校，如「八年级」）；年级管理员由学校管理员任命 */
@Entity('grades')
@Index(['schoolId', 'name'], { unique: true })
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64 })
  schoolId: string;

  /** 年级名，规范写法：一年级…高三 */
  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  /** 年级管理员（用户 id），未任命为 null */
  @Column({ name: 'grade_admin_id', type: 'varchar', length: 64, nullable: true })
  gradeAdminId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
