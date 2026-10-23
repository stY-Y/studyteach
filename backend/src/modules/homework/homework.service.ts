import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
  UserRole,
} from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ClassesService } from '../classes/classes.service';
import { Question } from '../questions/entities/question.entity';
import { QuestionsService } from '../questions/questions.service';
import { Homework, HomeworkQuestion } from './entities/homework.entity';
import { HomeworkSubmission } from './entities/homework-submission.entity';
import { ClassQueryDto, CreateHomeworkDto, SubmitHomeworkDto } from './dto/homework.dto';

/** 客观题（可自动判分） */
const AUTO_TYPES: string[] = [
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
];

const CN_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

/** 从班级年级文本（如「八年级」）解析出数字年级 */
function parseGrade(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const matched = text.match(/([一二三四五六七八九十]|\d{1,2})\s*年级/);
  if (!matched) return undefined;
  const raw = matched[1];
  const value = /^\d+$/.test(raw) ? Number(raw) : CN_NUM[raw];
  return value || undefined;
}

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homework)
    private readonly repo: Repository<Homework>,
    @InjectRepository(HomeworkSubmission)
    private readonly submissions: Repository<HomeworkSubmission>,
    private readonly classes: ClassesService,
    private readonly questions: QuestionsService,
  ) {}

  /**
   * 布置作业：仅班级创建教师（或管理员）。
   * 题目两种来源：① 选题库已有题（questionId）；② 教师自行上传（写入题库，持续扩充题量）。
   */
  async create(actor: AuthUser, dto: CreateHomeworkDto): Promise<Homework> {
    const room = await this.classes.getClassOrThrow(dto.classId);
    await this.classes.assertManager(actor, room);

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
        grade: item.grade ?? parseGrade(room.grade),
        chapter: item.chapter?.trim() || undefined,
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

    return this.repo.save(
      this.repo.create({
        classId: room.id,
        teacherId: actor.id,
        teacherName: actor.name ?? actor.username,
        schoolId: room.schoolId,
        grade: room.grade,
        className: room.className,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        status: 'open',
        questions: resolved,
        totalQuestions: resolved.length,
      }),
    );
  }

  /** 教师：查看自己班级的作业 */
  async listForClass(actor: AuthUser, query: ClassQueryDto): Promise<Homework[]> {
    const room = await this.classes.getClassOrThrow(query.classId);
    await this.classes.assertManager(actor, room);

    return this.repo.find({
      where: { classId: room.id },
      order: { createdAt: 'DESC' },
    });
  }

  /** 学生：已加入班级的作业 + 我的提交状态（不含答案） */
  async listMine(actor: AuthUser) {
    const classIds = await this.classes.getApprovedClassIds(actor.id);
    if (classIds.length === 0) return [];

    const list = await this.repo.find({
      where: { classId: In(classIds) },
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

  /** 作业详情：学生版本剥离答案与解析 */
  async detail(actor: AuthUser, id: string) {
    const homework = await this.findOne(id);

    if (actor.role === UserRole.STUDENT) {
      const ok = await this.classes.isApprovedMember(actor.id, homework.classId);
      if (!ok) throw new ForbiddenException('你尚未加入该班级，无法查看作业');

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

    // 非学生（班级管理员 / 年级管理员 / 学校管理员）走管理权限校验
    if (actor.role !== UserRole.STUDENT) {
      const ok = await this.classes.canManage(actor, homework.classId);
      if (!ok) throw new ForbiddenException('只有该班的班级管理员可以查看作业');
    }
    return homework;
  }

  /** 学生提交（需已通过入班审核；重复提交覆盖），客观题自动判分 */
  async submit(actor: AuthUser, id: string, dto: SubmitHomeworkDto) {
    const homework = await this.findOne(id);
    const ok = await this.classes.isApprovedMember(actor.id, homework.classId);
    if (!ok) throw new ForbiddenException('你尚未加入该班级，无法提交作业');
    if (homework.status !== 'open') {
      throw new BadRequestException('作业已截止，无法提交');
    }
    // 截止时间到点即视为关闭（教师未手动截止也不会让超期提交钻空子）
    if (homework.dueAt && homework.dueAt.getTime() < Date.now()) {
      throw new BadRequestException('已过于截止时间，无法提交；如需补交请联系老师');
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
    const ok = await this.classes.canManage(actor, homework.classId);
    if (!ok) throw new ForbiddenException('只有该班创建教师可以查看提交');

    const rows = await this.submissions.find({
      where: { homeworkId: id },
      order: { submittedAt: 'DESC' },
    });
    return { homework, submissions: rows };
  }

  /** 教师：截止作业 */
  async close(actor: AuthUser, id: string): Promise<Homework> {
    const homework = await this.findOne(id);
    const ok = await this.classes.canManage(actor, homework.classId);
    if (!ok) throw new ForbiddenException('只有该班创建教师可以关闭作业');

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
