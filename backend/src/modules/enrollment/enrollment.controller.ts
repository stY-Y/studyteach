import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { EnrollmentService } from './enrollment.service';
import { UpsertEnrollmentPolicyDto } from './dto/enrollment.dto';

@ApiTags('升学数据')
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '升学数据查询（招生政策/投档线/选科要求）' })
  list(@Query('year') year?: string, @Query('category') category?: string) {
    return this.enrollmentService.list(year ? Number(year) : undefined, category);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '年度同步更新升学数据（管理员）' })
  upsert(@Body() dto: UpsertEnrollmentPolicyDto) {
    return this.enrollmentService.upsert(dto);
  }
}