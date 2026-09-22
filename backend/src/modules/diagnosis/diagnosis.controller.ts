import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DiagnosisService } from './diagnosis.service';
import { StartDiagnosisDto, SubmitAnswersDto } from './dto/diagnosis.dto';

@ApiTags('知识诊断')
@Controller('diagnosis')
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @Post('start')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '开始诊断（抽取 10-15 道检测题）' })
  start(@CurrentUser() user: AuthUser, @Body() dto: StartDiagnosisDto) {
    return this.diagnosisService.start(user.id, dto);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '提交作答，10 秒内输出薄弱点清单与补漏路径' })
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.diagnosisService.submit(user.id, id, dto);
  }

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '我的诊断记录' })
  myRecords(@CurrentUser() user: AuthUser) {
    return this.diagnosisService.listByStudent(user.id);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '诊断记录详情（含逐题解析，仅本人可看）' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.diagnosisService.detail(user.id, id);
  }
}