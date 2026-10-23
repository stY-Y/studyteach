import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
  UserRole,
} from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { Question } from '../questions/entities/question.entity';
import { QuestionsService } from '../questions/questions.service';
import { UsersService } from '../users/users.service';
import { Homework, HomeworkQuestion } from './entities/homework.entity';
import { HomeworkSubmission } from './entities/homework-submission.entity';
import {
  ClassQueryDto,
  CreateHomeworkDto,
  SubmitHomeworkDto,
} from './dto/homework.dto';

/** 客观题（可自动判分） */
const AUTO_TYPES: string[] = [
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
];

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homework)
    private readonly repo: Repository<Homework>,
    @InjectRepository(HomeworkSubmission)
    private readonly submissions: Repository<HomeworkSubmission>,
    private readonly users: UsersService,
    private readonly questions: QuestionsService,
  ) {}

  /**
   * 布置作业。
   * 题目两种来源：① 选题库已有题（questionId）；② 教师自行上传（写入题库，持续扩充题量）。
   */
  async create(actor: AuthUser, dto: CreateHomeworkDto): Promise<Homework> {
    if (actor.role === UserRole.TEACHER && (!actor.schoolId || actor.schoolId !== dto.schoolId)) {
      throw new ForbiddenException('只能给本校班级布置作业');
    }

    const resolved: HomeworkQuestion[] = [];

    for (let i = 0; i < dto.questions.length; i += 1) {
      const item = dto.questions[i];
      const key = `q-${i}`;

      if (item.questionId) {
        const existing = await this.questions.findById(item.questionId);
        resolved.push(this.snapshot(existing, key));
        continue;
      }

      if (!item.content || !item.content.trim()) continue;

      // 教师自行上传的题目：写入题库，扩充题量（source 标记便于追溯）
      const created = await this.questions.create({
        subject: item.subject ?? Subject.MATH,
        stage: item.stage ?? StudyStage.JUNIOR,
        type: item.type ?? QuestionType.SHORT_ANSWER,
        difficulty: item.difficulty ?? DifficultyLevel.MEDIUM,
        ability: AbilityRequirement.UNDERSTAND,
        knowledgePoints: item.knowledgePoints ?? [],
        content: item.content.trim(),
        options: item.options,
        answer: item.answer,
        analysis: item.analysis,
        typicalErrors: [],
        source: 'teacher:upload',
      });
      resolved.push(this.snapshot(created, key));
    }

    if (resolved.length === 0) {
      throw new BadRequestException('请至少选择或上传一道题');
    }

    const homework = this.repo.create({
      teacherId: actor.id,
      teacherName: actor.name ?? actor.username,
      schoolId: dto.schoolId,
      grade: dto.grade,
      className: dto.className,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      status: 'open',
      questions: resolved,
      totalQuestions: resolved.length,
    });
    return this.repo.save(homework);
  }

  /** 教师/管理员：查看指定班级作业 */
  listForClass(actor: AuthUser, query: ClassQueryDto): Promise<Homework[]> {
    if (actor.role === UserRole.TEACHER && actor.schoolId && actor.schoolId !== query.schoolId) {
      throw new ForbiddenException('仅可查看本校班级作业');
    }
    return this.repo.find({
      where: {
        schoolId: query.schoolId,
        grade: query.grade,
        className: query.className,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /** 学生：本班作业 + 我的提交状态（不含答案） */
  async listMine(actor: AuthUser) {
    const profile = await this.users.getStudentProfile(actor.id);
    if (!profile || !profile.schoolId || !profile.grade || !profile.className) {
      throw new BadRequestException('请先在「我的档案」补全学校、年级与班级');
    }

    const list = await this.repo.find({
      where: {
        schoolId: profile.schoolId,
        grade: profile.grade,
        className: profile.className,
      },
      order: { createdAt: 'DESC' },
    });

    const mine = await this.submissions.find({ where: { studentId: actor.id } });
    const byHomework = new Map(mine.map((s) => [s.homeworkId, s]));

    return list.map((hw) => {
      const submission = byHomework.get(hw.id);
      return {
        ...this.forStudent(hw),
        mySubmission: submission
          ? { score: submission.score, submittedAt: submission.submittedAt }
          : null,
      };
    });
  }

  /** 作业详情：学生版本剥离答案与解析，防止提前看到答案 */
  async detail(actor: AuthUser, id: string) {
    const homework = await this.findOne(id);
    if (actor.role === UserRole.STUDENT) {
      await this.assertStudentOfClass(actor, homework);
      const submission = await this.submissions.findOne({
        where: { homeworkId: id, studentId: actor.id },
      });
      return {
        ...this.forStudent(homework),
        mySubmission: submission
          ? { score: submission.score, submittedAt: submission.submittedAt }
          : null,
      };
    }
    return homework;
  }

  /** 学生提交（重复提交覆盖），客观题自动判分 */
  async submit(actor: AuthUser, id: string, dto: SubmitHomeworkDto) {
    const homework = await this.findOne(id);
    await this.assertStudentOfClass(actor, homework);
    if (homework.status !== 'open') {
      throw new BadRequestException('作业已截止，无法提交');
    }

    const answers = dto.answers ?? {};
    const score = this.grade(homework, answers);

    const existing = await this.submissions.findOne({
      where: { homeworkId: id, studentId: actor.id },
    });
    if (existing) {
      existing.answers = answers;
      existing.score = score;
      return this.submissions.save(existing);
    }

    return this.submissions.save(
      this.submissions.create({
        homeworkId: id,
        studentId: actor.id,
        studentName: actor.name ?? actor.username,
        answers,
        score,
      }),
    );
  }

  /** 教师：查看某次作业的提交情况 */
  async submissionsOf(actor: AuthUser, id: string) {
    const homework = await this.findOne(id);
    if (actor.role !== UserRole.ADMIN && homework.teacherId !== actor.id) {
      throw new ForbiddenException('只能查看自己布置的作业提交');
    }
    const rows = await this.submissions.find({
      where: { homeworkId: id },
      order: { submittedAt: 'DESC' },
    });
    return { homework, submissions: rows };
  }

  /** 教师：截止作业 */
  async close(actor: AuthUser, id: string): Promise<Homework> {
    const homework = await this.findOne(id);
    if (actor.role !== UserRole.ADMIN && homework.teacherId !== actor.id) {
      throw new ForbiddenException('只能关闭自己布置的作业');
    }
    homework.status = 'closed';
    return this.repo.save(homework);
  }

  // ---------- 内部工具 ----------

  private async findOne(id: string): Promise<Homework> {
    const homework = await this.repo.findOne({ where: { id } });
    if (!homework) throw new NotFoundException('作业不存在');
    return homework;
  }

  /** 题目快照：题库后续修改不影响已布置作业 */
  private snapshot(question: Question, key: string): HomeworkQuestion {
    return {
      key,
      questionId: question.id,
      content: question.content,
      type: question.type,
      options: question.options ?? [],
      answer: question.answer ?? '',
      analysis: question.analysis ?? '',
      difficulty: question.difficulty,
      subject: question.subject,
      stage: question.stage,
    };
  }

  /** 学生视图：剥离答案与解析 */
  private forStudent(homework: Homework): Omit<Homework, 'questions'> & {
    questions: Array<Omit<HomeworkQuestion, 'answer' | 'analysis'>>;
  } {
    return {
      ...homework,
      questions: homework.questions.map((q) => {
        const { answer: _answer, analysis: _analysis, ...rest } = q;
        return rest;
      }),
    };
  }

  private async assertStudentOfClass(actor: AuthUser, homework: Homework): Promise<void> {
    const profile = await this.users.getStudentProfile(actor.id);
    if (
      !profile ||
      profile.schoolId !== homework.schoolId ||
      profile.grade !== homework.grade ||
      profile.className !== homework.className
    ) {
      throw new ForbiddenException('仅本班学生可查看该作业');
    }
  }

  /** 客观题自动判分（0-100）；无客观题返回 null */
  private grade(homework: Homework, answers: Record<string, string>): number | null {
    const auto = homework.questions.filter(
      (q) => AUTO_TYPES.includes(q.type) && (q.answer ?? '').trim(),
    );
    if (auto.length === 0) return null;

    let correct = 0;
    for (const q of auto) {
      const submitted = (answers[q.key] ?? '').toString().trim();
      if (this.isCorrect(q, submitted)) correct += 1;
    }
    return Math.round((correct / auto.length) * 100);
  }

  private isCorrect(question: HomeworkQuestion, submitted: string): boolean {
    const expected = (question.answer ?? '').trim();
    if (!submitted) return false;

    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      const normalize = (value: string): string =>
        value
          .split(/[,，\s]+/)
          .filter(Boolean)
          .map((x) => x.toUpperCase())
          .sort()
          .join(',');
      return normalize(submitted) === normalize(expected);
    }
    return submitted.toLowerCase() === expected.toLowerCase();
  }
}
