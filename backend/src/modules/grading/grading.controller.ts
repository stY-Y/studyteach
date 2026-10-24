import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { GradingService } from './grading.service';
import { GradeQuestionDto } from './dto/grading.dto';

@ApiTags('智能批改')
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '提交作答批改（错因分析 + 关键点逐层提示，要到底才给答案与解析）' })
  grade(@CurrentUser() user: AuthUser, @Body() dto: GradeQuestionDto) {
    return this.gradingService.grade(user.id, dto);
  }

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '我的批改记录' })
  myRecords(@CurrentUser() user: AuthUser) {
    return this.gradingService.listByStudent(user.id);
  }
}