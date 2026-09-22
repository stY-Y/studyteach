import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 教师档案：任教学校/学科/职称 */
@Entity('teacher_profiles')
export class TeacherProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64, nullable: true })
  schoolId: string;

  @Column({ type: 'simple-json', nullable: true })
  subjects: string[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  title: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}