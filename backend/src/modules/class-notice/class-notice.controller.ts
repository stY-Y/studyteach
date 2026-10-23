import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClassNoticeService } from './class-notice.service';
import { CreateClassNoticeDto, UpdateClassNoticeDto } from './dto/class-notice.dto';

@ApiTags('班级通知')
@Controller('classes/:id/notices')
export class ClassNoticeController {
  constructor(private readonly notices: ClassNoticeService) {}

  @Get()
  @ApiOperation({ summary: '本班通知列表（学生需审核通过；置顶优先）' })
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notices.list(user, id);
  }

  @Post()
  @ApiOperation({ summary: '发布班级通知（班级管理员及以上）' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateClassNoticeDto,
  ) {
    return this.notices.create(user, id, dto);
  }

  @Patch(':noticeId')
  @ApiOperation({ summary: '编辑通知 / 置顶（发布者或班级管理员）' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('noticeId') noticeId: string,
    @Body() dto: UpdateClassNoticeDto,
  ) {
    return this.notices.update(user, id, noticeId, dto);
  }

  @Delete(':noticeId')
  @ApiOperation({ summary: '删除通知（发布者或班级管理员）' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('noticeId') noticeId: string,
  ) {
    return this.notices.remove(user, id, noticeId);
  }
}
