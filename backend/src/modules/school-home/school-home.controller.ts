import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolHomeService } from './school-home.service';

@ApiTags('家校互通')
@Controller('school-home')
export class SchoolHomeController {
  constructor(private readonly schoolHomeService: SchoolHomeService) {}

  @Get('children-progress')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '家长查看已绑定学生的学情进度' })
  childrenProgress(@CurrentUser() user: AuthUser) {
    return this.schoolHomeService.childrenProgress(user.id);
  }
}