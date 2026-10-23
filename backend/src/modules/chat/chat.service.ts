import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ClassesService } from '../classes/classes.service';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { QueryMessagesDto, SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
    private readonly classes: ClassesService,
  ) {}

  /** 拉取本班最近消息（按时间正序返回，便于前端直接渲染） */
  async list(actor: AuthUser, query: QueryMessagesDto): Promise<ChatMessage[]> {
    const room = await this.classes.getClassOrThrow(query.classId);
    await this.assertAccess(actor, room);

    const limit = Math.min(query.limit ?? 50, 100);
    const rows = await this.repo.find({
      where: { classId: room.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  /** 发送消息（仅审核通过的班级成员 / 班级创建教师 / 管理员） */
  async send(actor: AuthUser, dto: SendMessageDto): Promise<ChatMessage> {
    const room = await this.classes.getClassOrThrow(dto.classId);
    await this.assertAccess(actor, room);

    const content = dto.content.trim();
    if (!content) throw new ForbiddenException('消息不能为空');

    return this.repo.save(
      this.repo.create({
        classId: room.id,
        classroomKey: room.id,
        schoolId: room.schoolId,
        grade: room.grade,
        className: room.className,
        senderId: actor.id,
        senderName: actor.name ?? actor.username,
        senderRole: actor.role,
        content,
      }),
    );
  }

  /**
   * 访问校验：
   *  - 学生：必须已通过入班审核（pending / rejected 一律拒绝）
   *  - 教师：必须是该班创建者
   *  - 管理员：可进入任意班级
   *  - 家长：不支持
   */
  private async assertAccess(actor: AuthUser, room: ClassRoom): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;

    if (actor.role === UserRole.TEACHER) {
      if (await this.classes.canManage(actor, room.id)) return;
      throw new ForbiddenException('只有该班创建教师可以进入班级聊天');
    }

    if (actor.role === UserRole.STUDENT) {
      if (await this.classes.isApprovedMember(actor.id, room.id)) return;
      throw new ForbiddenException('你的入班申请尚未通过，暂不能使用班级聊天');
    }

    throw new ForbiddenException('家长账号暂不支持班级聊天');
  }
}
