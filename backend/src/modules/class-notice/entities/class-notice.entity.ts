import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 班级通知：班主任（班级管理员）发给本班学生的公告。
 * 与聊天消息分表：通知需要置顶、可编辑、可长期留存，聊天是流水。
 */
@Entity('class_notices')
@Index(['classId', 'createdAt'])
export class ClassNotice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id', type: 'varchar', length: 64 })
  classId: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64, nullable: true })
  schoolId: string | null;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  /** 置顶：排在通知列表最前，适合放假安排、考试时间这类重要事项 */
  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ name: 'from_user_id', type: 'varchar', length: 64 })
  fromUserId: string;

  @Column({ name: 'from_name', type: 'varchar', length: 64, nullable: true })
  fromName: string | null;

  /** class_admin / grade_admin / school_admin / admin */
  @Column({ name: 'from_role', type: 'varchar', length: 32 })
  fromRole: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
