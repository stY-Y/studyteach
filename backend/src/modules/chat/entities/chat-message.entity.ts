import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 班级聊天消息。
 * 以「学校 + 年级 + 班级」三元组组成房间（classroomKey），仅同班成员可见，不支持私聊。
 */
@Entity('chat_messages')
@Index(['classroomKey', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 所属班级 id（使用班级聊天必须已通过入班审核） */
  @Column({ name: 'class_id', type: 'varchar', length: 64 })
  classId: string;

  /** 房间键（等于 classId，保留兼容） */
  @Column({ name: 'classroom_key', type: 'varchar', length: 160 })
  classroomKey: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64 })
  schoolId: string;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  @Column({ name: 'class_name', type: 'varchar', length: 64 })
  className: string;

  @Column({ name: 'sender_id', type: 'varchar', length: 64 })
  senderId: string;

  /** 冗余显示名：账号注销时消息随人删除，不会残留个人姓名 */
  @Column({ name: 'sender_name', type: 'varchar', length: 64, nullable: true })
  senderName: string | null;

  @Column({ name: 'sender_role', type: 'varchar', length: 32 })
  senderRole: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
