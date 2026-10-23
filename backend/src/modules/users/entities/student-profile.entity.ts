import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 学生档案：年级/班级/选科（关联知识点图谱与诊断） */
@Entity('student_profiles')
export class StudentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64, nullable: true })
  schoolId: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  grade: string;

  @Column({ name: 'class_name', type: 'varchar', length: 64, nullable: true })
  className: string;

  /** 选科（高考 3+1+2 等），JSON 数组 */
  @Column({ type: 'simple-json', nullable: true })
  subjects: string[];

  @Column({ name: 'guardian_phone', type: 'varchar', length: 255, nullable: true })
  guardianPhone: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}