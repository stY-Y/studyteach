import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClassesService } from './classes.service';

@ApiTags('班级')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: '班级列表（按学校/年级/班级聚合，供注册、作业、聊天选择）' })
  list(@Query('schoolId') schoolId?: string) {
    return this.classesService.list(schoolId);
  }
}
