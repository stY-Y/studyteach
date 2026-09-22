import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaperService } from './paper.service';
import { GeneratePaperDto } from './dto/paper.dto';

@ApiTags('智能组卷')
@Controller('papers')
export class PaperController {
  constructor(private readonly paperService: PaperService) {}

  @Post('generate')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '按知识点/难度/题量生成试卷' })
  generate(@CurrentUser() user: AuthUser, @Body() dto: GeneratePaperDto) {
    return this.paperService.generate(user.id, dto);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '我生成的试卷' })
  myPapers(@CurrentUser() user: AuthUser) {
    return this.paperService.listByCreator(user.id);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '试卷详情（含真实题目）' })
  detail(@Param('id') id: string) {
    return this.paperService.detail(id);
  }
}