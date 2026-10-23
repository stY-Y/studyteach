import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { VolunteerService } from './volunteer.service';
import { MatchVolunteerDto } from './dto/volunteer.dto';

@ApiTags('志愿匹配')
@Controller('volunteer')
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) {}

  @Post('match')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '生成「冲稳保」志愿方案（标注报考限制）' })
  match(@CurrentUser() user: AuthUser, @Body() dto: MatchVolunteerDto) {
    return this.volunteerService.match(user.id, dto);
  }

  @Get('plans')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '我的志愿方案' })
  myPlans(@CurrentUser() user: AuthUser) {
    return this.volunteerService.listByStudent(user.id);
  }

  @Get('colleges')
  @ApiOperation({ summary: '院校库（按年份）' })
  colleges(@Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number) {
    return this.volunteerService.listColleges(year || undefined);
  }

  @Delete('plans/:id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '删除本人的志愿方案' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.volunteerService.remove(user.id, id);
  }
}