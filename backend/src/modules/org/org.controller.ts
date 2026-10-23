import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgService } from './org.service';
import {
  AppointUserDto,
  CreateGradeDto,
  CreateNoticeDto,
  CreateOrgClassDto,
  CreateSchoolDto,
  UpdateOrgClassDto,
} from './dto/org.dto';

@ApiTags('组织管理')
@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  // ---------- 学校（平台管理员） ----------

  @Get('schools')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '学校列表（含学校管理员）' })
  schools(@CurrentUser() user: AuthUser) {
    return this.orgService.listSchools(user);
  }

  @Post('schools')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '新增学校（平台管理员）' })
  createSchool(@CurrentUser() user: AuthUser, @Body() dto: CreateSchoolDto) {
    return this.orgService.createSchool(user, dto);
  }

  @Delete('schools/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除学校（需先清空年级与班级）' })
  deleteSchool(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgService.deleteSchool(user, id);
  }

  @Post('schools/:id/admins')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '任命学校管理员（按账号）' })
  appointSchoolAdmin(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AppointUserDto,
  ) {
    return this.orgService.appointSchoolAdmin(user, id, dto);
  }

  @Delete('schools/:id/admins/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '卸任学校管理员' })
  dismissSchoolAdmin(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.orgService.dismissSchoolAdmin(user, id, userId);
  }

  // ---------- 年级（学校管理员） ----------

  @Get('grades')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN)
  @ApiOperation({ summary: '年级列表（学校管理员看本校，年级管理员看自己年级）' })
  grades(@CurrentUser() user: AuthUser, @Query('schoolId') schoolId?: string) {
    return this.orgService.listGrades(user, schoolId);
  }

  @Post('grades')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '新增年级' })
  createGrade(@CurrentUser() user: AuthUser, @Body() dto: CreateGradeDto) {
    return this.orgService.createGrade(user, dto);
  }

  @Delete('grades/:id')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '删除年级（需先清空班级）' })
  deleteGrade(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgService.deleteGrade(user, id);
  }

  @Post('grades/:id/admin')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '任命年级管理员（按账号）' })
  appointGradeAdmin(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AppointUserDto,
  ) {
    return this.orgService.appointGradeAdmin(user, id, dto);
  }

  @Delete('grades/:id/admin')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '卸任年级管理员' })
  dismissGradeAdmin(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgService.dismissGradeAdmin(user, id);
  }

  // ---------- 班级（年级管理员） ----------

  @Get('classes')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN)
  @ApiOperation({ summary: '年级下的班级列表' })
  classes(@CurrentUser() user: AuthUser, @Query('gradeId') gradeId: string) {
    return this.orgService.listClasses(user, gradeId);
  }

  @Post('classes')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN)
  @ApiOperation({ summary: '新增班级并指定班主任' })
  createClass(@CurrentUser() user: AuthUser, @Body() dto: CreateOrgClassDto) {
    return this.orgService.createClass(user, dto);
  }

  @Patch('classes/:id')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN)
  @ApiOperation({ summary: '修改班级（含任命/卸任班主任）' })
  updateClass(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrgClassDto,
  ) {
    return this.orgService.updateClass(user, id, dto);
  }

  @Delete('classes/:id')
  @Roles(UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN)
  @ApiOperation({ summary: '删除班级（需先移除学生）' })
  deleteClass(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgService.deleteClass(user, id);
  }

  // ---------- 通知 ----------

  @Post('notices')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN)
  @ApiOperation({ summary: '下发通知（学校→年级管理员 / 年级→班主任）' })
  createNotice(@CurrentUser() user: AuthUser, @Body() dto: CreateNoticeDto) {
    return this.orgService.createNotice(user, dto);
  }

  @Get('notices')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '收到的通知' })
  inbox(@CurrentUser() user: AuthUser) {
    return this.orgService.inbox(user);
  }

  @Get('notices/sent')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN)
  @ApiOperation({ summary: '我发出的通知' })
  sent(@CurrentUser() user: AuthUser) {
    return this.orgService.sent(user);
  }
}
