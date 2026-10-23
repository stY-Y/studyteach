import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 班级成员申请：pending 待审核 / approved 已通过 / rejected 已拒绝 */
@Entity('class_members')
@Index(['classId', 'studentId'], { unique: true })
export class ClassMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id', type: 'varchar', length: 64 })
  classId: string;

  @Column({ name: 'student_id', type: 'varchar', length: 64 })
  studentId: string;

  @Column({ name: 'student_name', type: 'varchar', length: 64, nullable: true })
  studentName: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt: Date | null;
}
