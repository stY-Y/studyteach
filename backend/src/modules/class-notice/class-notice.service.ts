import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRole, UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ClassesService } from '../classes/classes.service';
import { ClassNotice } from './entities/class-notice.entity';
import { CreateClassNoticeDto, UpdateClassNoticeDto } from './dto/class-notice.dto';

@Injectable()
export class ClassNoticeService {
  constructor(
    @InjectRepository(ClassNotice)
    private readonly notices: Repository<ClassNotice>,
    private readonly classes: ClassesService,
  ) {}

  /**
   * 通知列表：本班已通过审核的学生，或可管理该班的管理者（班级/年级/学校/平台）。
   * 置顶优先，其次按发布时间倒序。
   */
  async list(actor: AuthUser, classId: string) {
    const room = await this.classes.getClassOrThrow(classId);
    await this.assertReadable(actor, classId);

    const list = await this.notices.find({
      where: { classId },
      order: { pinned: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
    return {
      classRoom: { id: room.id, name: room.name },
      notices: list,
    };
  }

  /** 发布通知：只有能管理该班的人（班主任/年级/学校/平台管理员） */
  async create(actor: AuthUser, classId: string, dto: CreateClassNoticeDto) {
    const room = await this.classes.getClassOrThrow(classId);
    await this.classes.assertManager(actor, room);

    return this.notices.save(
      this.notices.create({
        classId: room.id,
        schoolId: room.schoolId,
        title: dto.title.trim(),
        content: dto.content.trim(),
        pinned: dto.pinned ?? false,
        fromUserId: actor.id,
        fromName: actor.name ?? actor.username,
        fromRole: this.roleOf(actor),
      }),
    );
  }

  /** 编辑通知：发布者本人或当前仍可管理该班的人 */
  async update(actor: AuthUser, classId: string, noticeId: string, dto: UpdateClassNoticeDto) {
    const notice = await this.noticeOrThrow(classId, noticeId);
    await this.assertEditable(actor, classId, notice);

    const patch: Partial<ClassNotice> = {};
    if (dto.title !== undefined) patch.title = dto.title.trim();
    if (dto.content !== undefined) patch.content = dto.content.trim();
    if (dto.pinned !== undefined) patch.pinned = dto.pinned;

    if (Object.keys(patch).length > 0) await this.notices.update(notice.id, patch);
    return this.noticeOrThrow(classId, noticeId);
  }

  async remove(actor: AuthUser, classId: string, noticeId: string) {
    const notice = await this.noticeOrThrow(classId, noticeId);
    await this.assertEditable(actor, classId, notice);
    await this.notices.delete(notice.id);
    return { deleted: true };
  }

  // ---------- 权限 ----------

  /** 记录发布者身份，优先班级管理员，其次其他管理岗位 */
  private roleOf(actor: AuthUser): string {
    const roles = actor.staffRoles ?? [];
    if (roles.includes(StaffRole.CLASS_ADMIN)) return StaffRole.CLASS_ADMIN;
    if (roles.includes(StaffRole.GRADE_ADMIN)) return StaffRole.GRADE_ADMIN;
    if (roles.includes(StaffRole.SCHOOL_ADMIN)) return StaffRole.SCHOOL_ADMIN;
    return actor.role;
  }

  private async assertReadable(actor: AuthUser, classId: string): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    if (await this.classes.canManage(actor, classId)) return;

    if (actor.role === UserRole.STUDENT) {
      if (await this.classes.isApprovedMember(actor.id, classId)) return;
      throw new ForbiddenException('你的入班申请尚未通过，暂不能查看班级通知');
    }

    throw new ForbiddenException('只有本班成员与本班老师可以查看班级通知');
  }

  private async assertEditable(
    actor: AuthUser,
    classId: string,
    notice: ClassNotice,
  ): Promise<void> {
    if (notice.fromUserId === actor.id) return;
    if (await this.classes.canManage(actor, classId)) return;
    throw new ForbiddenException('只有发布者或本班班级管理员可以修改该通知');
  }

  private async noticeOrThrow(classId: string, noticeId: string): Promise<ClassNotice> {
    const notice = await this.notices.findOne({ where: { id: noticeId, classId } });
    if (!notice) throw new NotFoundException('通知不存在或已被删除');
    return notice;
  }
}
