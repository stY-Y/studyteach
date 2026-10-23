import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import {
  CreateClassDto,
  JoinByCodeDto,
  ReviewMemberDto,
  TransferMemberDto,
} from './dto/class.dto';

@ApiTags('班级')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('mine')
  @ApiOperation({ summary: '我的班级（学生：申请/加入状态；教师：我创建的班级）' })
  async mine(@CurrentUser() user: AuthUser) {
    if (user.role === UserRole.STUDENT) {
      return { student: await this.classesService.listMine(user), teacher: [] };
    }
    return { student: [], teacher: await this.classesService.listManaged(user) };
  }

  @Get('available')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '学生：可申请的班级（同校同年级，已申请的除外）' })
  available(@CurrentUser() user: AuthUser) {
    return this.classesService.listAvailable(user);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '教师创建班级（生成邀请码，等待学生申请）' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClassDto) {
    return this.classesService.create(user, dto);
  }

  @Post('join-by-code')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '学生凭邀请码申请加入班级' })
  joinByCode(@CurrentUser() user: AuthUser, @Body() dto: JoinByCodeDto) {
    return this.classesService.joinByCode(user, dto.inviteCode);
  }

  @Post(':id/join')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '学生申请加入班级（需教师审核）' })
  join(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classesService.join(user, id);
  }

  @Get(':id/members')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '班级成员与待审申请（仅班级创建教师）' })
  members(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classesService.members(user, id);
  }

  @Patch(':id/members/:memberId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '审核学生申请（通过后学生才可使用聊天与作业）' })
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: ReviewMemberDto,
  ) {
    return this.classesService.review(user, id, memberId, dto.status);
  }

  @Post(':id/members/:studentId/transfer')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '教师转班：把学生转到自己管理的另一个班级' })
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: TransferMemberDto,
  ) {
    return this.classesService.transferMember(user, id, studentId, dto.targetClassId);
  }

  @Delete(':id/members/:studentId')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '移除成员或学生主动退出' })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.removeMember(user, id, studentId);
  }
}
