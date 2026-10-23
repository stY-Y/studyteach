import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 家长与教师的沟通消息。
 * 会话维度：班级 + 家长（同一家长在同一班级一个会话，孩子作为上下文）。
 * 家长只能与自己孩子所在班级的班主任沟通；教师只能与自己班级的家长沟通。
 */
@Entity('parent_teacher_messages')
@Index(['classId', 'parentId', 'createdAt'])
export class ParentTeacherMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id', type: 'varchar', length: 64 })
  classId: string;

  @Column({ name: 'parent_id', type: 'varchar', length: 64 })
  parentId: string;

  /** 关联的孩子（家长发送时带入，便于老师了解是哪个学生） */
  @Column({ name: 'student_id', type: 'varchar', length: 64, nullable: true })
  studentId: string | null;

  @Column({ name: 'teacher_id', type: 'varchar', length: 64 })
  teacherId: string;

  @Column({ name: 'sender_id', type: 'varchar', length: 64 })
  senderId: string;

  /** parent / teacher */
  @Column({ name: 'sender_role', type: 'varchar', length: 16 })
  senderRole: string;

  @Column({ name: 'sender_name', type: 'varchar', length: 64, nullable: true })
  senderName: string | null;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
