import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 家校绑定：家长与学生关联（支持外出务工家长远程查看学情） */
@Entity('parent_student_links')
export class ParentStudentLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parent_user_id', type: 'varchar', length: 64 })
  parentUserId: string;

  @Column({ name: 'student_user_id', type: 'varchar', length: 64 })
  studentUserId: string;

  /** pending / approved / rejected */
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}