import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudyStage, Subject, UserRole } from '@teachstudy/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgePointDto, UpdateKnowledgePointDto } from './dto/knowledge.dto';
import type { KnowledgeNode } from './knowledge.service';

@ApiTags('知识图谱')
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '知识点列表（可按学科/学段过滤）' })
  list(@Query('subject') subject?: Subject, @Query('stage') stage?: StudyStage) {
    return this.knowledgeService.list(subject, stage);
  }

  @Public()
  @Get('tree')
  @ApiOperation({ summary: '知识点树' })
  tree(@Query('subject') subject?: Subject): Promise<KnowledgeNode[]> {
    return this.knowledgeService.tree(subject);
  }

  @Get(':id')
  @ApiOperation({ summary: '知识点详情' })
  detail(@Param('id') id: string) {
    return this.knowledgeService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '新增知识点（管理员/教师）' })
  create(@Body() dto: CreateKnowledgePointDto) {
    return this.knowledgeService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '更新知识点' })
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgePointDto) {
    return this.knowledgeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除知识点（仅管理员）' })
  remove(@Param('id') id: string) {
    return this.knowledgeService.remove(id);
  }
}