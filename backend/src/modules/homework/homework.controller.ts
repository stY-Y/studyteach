import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { HomeworkService } from './homework.service';
import { ClassQueryDto, CreateHomeworkDto, SubmitHomeworkDto } from './dto/homework.dto';

@ApiTags('作业')
@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '教师布置作业（选题库题或自建题，自建题自动写入题库）' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHomeworkDto) {
    return this.homeworkService.create(user, dto);
  }

  // 必须声明在 :id 之前，避免 "mine" 被当成作业 id
  @Get('mine')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '学生：本班作业列表与我的提交状态' })
  mine(@CurrentUser() user: AuthUser) {
    return this.homeworkService.listMine(user);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '教师/管理员：按班级查看作业' })
  list(@CurrentUser() user: AuthUser, @Query() query: ClassQueryDto) {
    return this.homeworkService.listForClass(user, query);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '作业详情（学生版不含答案与解析）' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.homeworkService.detail(user, id);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '学生提交作业（客观题自动判分）' })
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitHomeworkDto,
  ) {
    return this.homeworkService.submit(user, id, dto);
  }

  @Get(':id/submissions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '教师：查看作业提交情况' })
  submissions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.homeworkService.submissionsOf(user, id);
  }

  @Patch(':id/close')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '教师：截止作业' })
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.homeworkService.close(user, id);
  }
}
