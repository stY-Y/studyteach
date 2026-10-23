import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatTargetDto, QueryMessagesDto, SendMessageDto } from './dto/chat.dto';

/** 班级房间键：学校 + 年级 + 班级名 */
function roomKey(target: ChatTargetDto): string {
  return `${target.schoolId}::${target.grade}::${target.className}`;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
    private readonly users: UsersService,
  ) {}

  /** 拉取本班最近消息（按时间正序返回，便于前端直接渲染） */
  async list(actor: AuthUser, query: QueryMessagesDto): Promise<ChatMessage[]> {
    await this.assertMember(actor, query);
    const key = roomKey(query);
    const limit = Math.min(query.limit ?? 50, 100);

    const rows = await this.repo.find({
      where: { classroomKey: key },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  /** 发送消息（仅本班成员） */
  async send(actor: AuthUser, dto: SendMessageDto): Promise<ChatMessage> {
    await this.assertMember(actor, dto);
    const content = dto.content.trim();
    if (!content) throw new ForbiddenException('消息不能为空');

    const message = this.repo.create({
      classroomKey: roomKey(dto),
      schoolId: dto.schoolId,
      grade: dto.grade,
      className: dto.className,
      senderId: actor.id,
      senderName: actor.name ?? actor.username,
      senderRole: actor.role,
      content,
    });
    return this.repo.save(message);
  }

  /**
   * 成员校验：
   *  - 学生：档案的学校/年级/班级必须完全一致（仅同班可见）
   *  - 教师：限本校
   *  - 管理员：可进入任意班级（便于管理）
   *  - 家长：不支持（保护未成年人，避免家长介入班级群聊）
   */
  private async assertMember(actor: AuthUser, target: ChatTargetDto): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;

    if (actor.role === UserRole.TEACHER) {
      if (!actor.schoolId || actor.schoolId !== target.schoolId) {
        throw new ForbiddenException('仅本校教师可进入该班级聊天');
      }
      return;
    }

    if (actor.role === UserRole.STUDENT) {
      const profile = await this.users.getStudentProfile(actor.id);
      if (
        !profile ||
        profile.schoolId !== target.schoolId ||
        profile.grade !== target.grade ||
        profile.className !== target.className
      ) {
        throw new ForbiddenException('仅本班成员可进入班级聊天');
      }
      return;
    }

    throw new ForbiddenException('家长账号暂不支持班级聊天');
  }
}
