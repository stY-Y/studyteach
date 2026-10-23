import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { QuestionType, StudyStage, Subject } from '@teachstudy/shared';

/** 作业中的一道题（创建时对题库做快照，题库后续变动不影响已布置作业） */
export interface HomeworkQuestion {
  /** 本次作业内的稳定键（q-0、q-1…），学生提交答案按此键回填 */
  key: string;
  questionId?: string;
  content: string;
  type: QuestionType;
  options?: string[];
  answer?: string;
  analysis?: string;
  difficulty?: string;
  subject: Subject;
  stage: StudyStage;
}

@Entity('homework')
@Index(['schoolId', 'grade', 'className', 'createdAt'])
export class Homework {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'teacher_id', type: 'varchar', length: 64 })
  teacherId: string;

  @Column({ name: 'teacher_name', type: 'varchar', length: 64, nullable: true })
  teacherName: string | null;

  /** 所属班级 id（由班级创建教师布置） */
  @Column({ name: 'class_id', type: 'varchar', length: 64 })
  classId: string;

  @Column({ name: 'school_id', type: 'varchar', length: 64 })
  schoolId: string;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  @Column({ name: 'class_name', type: 'varchar', length: 64 })
  className: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'due_at', type: 'datetime', nullable: true })
  dueAt: Date | null;

  /** open / closed */
  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: string;

  @Column({ type: 'simple-json' })
  questions: HomeworkQuestion[];

  @Column({ name: 'total_questions', type: 'int', default: 0 })
  totalQuestions: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
