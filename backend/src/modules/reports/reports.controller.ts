import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/report.dto';

@ApiTags('学情报表')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '生成极简版学情报表' })
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateReportDto) {
    return this.reportsService.generate(user.id, dto);
  }

  @Get('mine')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '我的学情报表' })
  mine(@CurrentUser() user: AuthUser) {
    return this.reportsService.listByStudent(user.id);
  }

  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.PARENT)
  @ApiOperation({ summary: '查看学生学情（教师/管理员/家长）' })
  viewStudent(@Param('studentId') studentId: string) {
    return this.reportsService.listByStudent(studentId);
  }
}