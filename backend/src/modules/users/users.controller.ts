import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService, SafeUserListItem } from './users.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  LinkParentDto,
  StudentProfileDto,
  TeacherProfileDto,
  UpdateProfileDto,
} from './dto/user.dto';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '当前用户信息（含学生/教师档案）' })
  async me(@CurrentUser() user: AuthUser) {
    // 安全视图：剔除 passwordHash；本人手机号/监护人手机解密明文
    return this.usersService.getMeView(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前用户基础信息' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/student-profile')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '学生：获取本人档案' })
  getMyStudentProfile(@CurrentUser() user: AuthUser) {
    // 解密监护人手机（学生本人查看，明文便于核对）
    return this.usersService.getStudentProfileView(user.id);
  }

  @Put('me/student-profile')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '学生：保存本人档案（年级/班级/选科）' })
  saveMyStudentProfile(@CurrentUser() user: AuthUser, @Body() dto: StudentProfileDto) {
    return this.usersService.saveStudentProfile(user.id, dto);
  }

  @Get('me/teacher-profile')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '教师：获取本人档案' })
  getMyTeacherProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getTeacherProfile(user.id);
  }

  @Put('me/teacher-profile')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '教师：保存本人档案' })
  saveMyTeacherProfile(@CurrentUser() user: AuthUser, @Body() dto: TeacherProfileDto) {
    return this.usersService.saveTeacherProfile(user.id, dto);
  }

  @Post('parent/link')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '家长：绑定学生（家校互通）' })
  linkParent(@CurrentUser() user: AuthUser, @Body() dto: LinkParentDto) {
    return this.usersService.linkParent(user.id, dto.studentUsername);
  }

  @Get('parent/children')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '家长：查看已绑定学生' })
  children(@CurrentUser() user: AuthUser) {
    return this.usersService.listChildren(user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '管理员：用户列表' })
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    // 脱敏：剔除 passwordHash，手机号脱敏展示
    const [rows, total] = await this.usersService.list(page, pageSize);
    return [rows.map((u) => this.usersService.toSafeUser(u)), total] as [
      SafeUserListItem[],
      number,
    ];
  }

  @Patch('me/password')
  @ApiOperation({ summary: '修改本人密码（需提供原密码）' })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Get('students')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '教师/管理员：可见学生列表（教师限本校，供学情查看选人）' })
  students(@CurrentUser() user: AuthUser) {
    return this.usersService.listStudents(user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '管理员：创建用户' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}