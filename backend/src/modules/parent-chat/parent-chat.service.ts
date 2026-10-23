import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ClassesService } from '../classes/classes.service';
import { ClassMember } from '../classes/entities/class-member.entity';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentProfile } from '../users/entities/student-profile.entity';
import { User } from '../users/entities/user.entity';
import { ParentTeacherMessage } from './entities/parent-teacher-message.entity';
import { QueryParentMessagesDto, SendParentMessageDto } from './dto/parent-chat.dto';

/** 家长-教师会话（家长视角：孩子+班主任；教师视角：家长+孩子） */
export interface ParentThread {
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string | null;
  parentId: string;
  parentName: string | null;
  studentId: string | null;
  studentName: string | null;
  lastMessage: { content: string; createdAt: Date; senderRole: string } | null;
}

@Injectable()
export class ParentChatService {
  constructor(
    @InjectRepository(ParentTeacherMessage)
    private readonly messages: Repository<ParentTeacherMessage>,
    @InjectRepository(ParentStudentLink)
    private readonly links: Repository<ParentStudentLink>,
    @InjectRepository(StudentProfile)
    private readonly profiles: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(ClassRoom)
    private readonly rooms: Repository<ClassRoom>,
    @InjectRepository(ClassMember)
    private readonly members: Repository<ClassMember>,
    private readonly classes: ClassesService,
  ) {}

  /** 会话列表：家长看自己孩子所在班级的班主任；教师看自己班级的家长 */
  async threads(actor: AuthUser): Promise<ParentThread[]> {
    if (actor.role === UserRole.PARENT) return this.threadsForParent(actor.id);
    if (actor.role === UserRole.TEACHER) return this.threadsForTeacher(actor.id);
    return [];
  }

  private async threadsForParent(parentId: string): Promise<ParentThread[]> {
    const links = await this.links.find({
      where: { parentUserId: parentId, status: 'approved' },
    });
    if (links.length === 0) return [];

    const profiles = await this.profiles.findBy({
      userId: In(links.map((l) => l.studentUserId)),
    });
    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

    const results: ParentThread[] = [];
    const seenClass = new Set<string>();
    const parent = await this.users.findOne({ where: { id: parentId } });

    for (const link of links) {
      const profile = profileByUser.get(link.studentUserId);
      if (!profile?.classId || seenClass.has(profile.classId)) continue;

      const room = await this.rooms.findOne({ where: { id: profile.classId } });
      if (!room) continue;
      seenClass.add(room.id);

      const student = await this.users.findOne({ where: { id: link.studentUserId } });
      const last = await this.messages.findOne({
        where: { classId: room.id, parentId },
        order: { createdAt: 'DESC' },
      });

      results.push({
        classId: room.id,
        className: room.name,
        teacherId: room.teacherId,
        teacherName: room.teacherName,
        parentId,
        parentName: parent?.name ?? parent?.username ?? null,
        studentId: student?.id ?? null,
        studentName: student?.name ?? student?.username ?? null,
        lastMessage: last
          ? { content: last.content, createdAt: last.createdAt, senderRole: last.senderRole }
          : null,
      });
    }

    return results.sort(byLastMessageDesc);
  }

  private async threadsForTeacher(teacherId: string): Promise<ParentThread[]> {
    const rooms = await this.rooms.find({ where: { teacherId } });
    if (rooms.length === 0) return [];

    const results: ParentThread[] = [];
    const seen = new Set<string>();

    for (const room of rooms) {
      const members = await this.members.find({
        where: { classId: room.id, status: 'approved' },
      });
      if (members.length === 0) continue;

      const links = await this.links.find({
        where: {
          studentUserId: In(members.map((m) => m.studentId)),
          status: 'approved',
        },
      });

      for (const link of links) {
        const key = `${room.id}:${link.parentUserId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const parent = await this.users.findOne({ where: { id: link.parentUserId } });
        const student = await this.users.findOne({ where: { id: link.studentUserId } });
        const last = await this.messages.findOne({
          where: { classId: room.id, parentId: link.parentUserId },
          order: { createdAt: 'DESC' },
        });

        results.push({
          classId: room.id,
          className: room.name,
          teacherId: room.teacherId,
          teacherName: room.teacherName,
          parentId: link.parentUserId,
          parentName: parent?.name ?? parent?.username ?? null,
          studentId: student?.id ?? null,
          studentName: student?.name ?? student?.username ?? null,
          lastMessage: last
            ? { content: last.content, createdAt: last.createdAt, senderRole: last.senderRole }
            : null,
        });
      }
    }

    return results.sort(byLastMessageDesc);
  }

  /** 消息列表：家长只能看自己的；教师只能看自己班级的家长 */
  async list(actor: AuthUser, query: QueryParentMessagesDto): Promise<ParentTeacherMessage[]> {
    const room = await this.classes.getClassOrThrow(query.classId);
    const parentId = await this.resolveConversation(actor, room, query.parentId);

    return this.messages.find({
      where: { classId: room.id, parentId },
      order: { createdAt: 'ASC' },
      take: 300,
    });
  }

  /** 发送消息：家长发给班主任；教师回复某位家长 */
  async send(actor: AuthUser, dto: SendParentMessageDto): Promise<ParentTeacherMessage> {
    const room = await this.classes.getClassOrThrow(dto.classId);
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('消息不能为空');

    const parentId = await this.resolveConversation(actor, room, dto.parentId, dto.studentId);
    const studentId = await this.resolveStudentId(actor, room, parentId, dto.studentId);

    return this.messages.save(
      this.messages.create({
        classId: room.id,
        parentId,
        studentId,
        teacherId: room.teacherId,
        senderId: actor.id,
        senderRole: actor.role === UserRole.PARENT ? 'parent' : 'teacher',
        senderName: actor.name ?? actor.username,
        content,
      }),
    );
  }

  /**
   * 确定会话的另一端（家长 id）：
   *  - 家长：就是自己
   *  - 教师/管理员：必须显式指定家长，且该家长的孩子确实在该班
   */
  private async resolveConversation(
    actor: AuthUser,
    room: ClassRoom,
    parentIdInput?: string,
    studentIdInput?: string,
  ): Promise<string> {
    if (actor.role === UserRole.PARENT) {
      await this.assertParentOfClass(actor.id, room.id, studentIdInput);
      return actor.id;
    }

    if (actor.role === UserRole.TEACHER || actor.role === UserRole.ADMIN) {
      await this.classes.assertManager(actor, room);
      if (!parentIdInput) throw new BadRequestException('请指定要沟通的家长');
      await this.assertParentOfClass(parentIdInput, room.id);
      return parentIdInput;
    }

    throw new ForbiddenException('该角色不支持家长沟通');
  }

  /** 校验家长确实有孩子在该班（可指定某个孩子） */
  private async assertParentOfClass(
    parentId: string,
    classId: string,
    studentId?: string,
  ): Promise<void> {
    const links = await this.links.find({
      where: { parentUserId: parentId, status: 'approved' },
    });
    if (links.length === 0) throw new ForbiddenException('请先绑定孩子');

    const profiles = await this.profiles.findBy({
      userId: In(links.map((l) => l.studentUserId)),
    });
    const inClass = profiles.filter((p) => p.classId === classId);
    if (inClass.length === 0) throw new ForbiddenException('孩子不在该班级');

    if (studentId && !inClass.some((p) => p.userId === studentId)) {
      throw new ForbiddenException('该孩子不在本班');
    }
  }

  /** 消息关联的孩子：优先用传入的，否则取家长在该班的第一个孩子 */
  private async resolveStudentId(
    actor: AuthUser,
    room: ClassRoom,
    parentId: string,
    studentIdInput?: string,
  ): Promise<string | null> {
    if (studentIdInput) return studentIdInput;

    const links = await this.links.find({
      where: { parentUserId: parentId, status: 'approved' },
    });
    const profiles = await this.profiles.findBy({
      userId: In(links.map((l) => l.studentUserId)),
    });
    return profiles.find((p) => p.classId === room.id)?.userId ?? null;
  }
}

function byLastMessageDesc(a: ParentThread, b: ParentThread): number {
  const ta = a.lastMessage?.createdAt?.getTime() ?? 0;
  const tb = b.lastMessage?.createdAt?.getTime() ?? 0;
  return tb - ta;
}
