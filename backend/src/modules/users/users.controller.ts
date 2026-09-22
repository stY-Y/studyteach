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
import { UsersService } from './users.service';
import {
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
    const base = await this.usersService.findById(user.id);
    const studentProfile =
      base?.role === UserRole.STUDENT ? await this.usersService.getStudentProfile(user.id) : null;
    const teacherProfile =
      base?.role === UserRole.TEACHER ? await this.usersService.getTeacherProfile(user.id) : null;
    return { ...base, studentProfile, teacherProfile };
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
    return this.usersService.getStudentProfile(user.id);
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
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.usersService.list(page, pageSize);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '管理员：创建用户' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}