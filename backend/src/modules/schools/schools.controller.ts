import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/school.dto';

@ApiTags('学校')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @ApiOperation({ summary: '学校列表（登录用户均可查看）' })
  list() {
    return this.schoolsService.list();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '管理员：新增学校' })
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }
}
