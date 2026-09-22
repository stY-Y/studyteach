import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
  UserRole,
} from '@teachstudy/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@ApiTags('题库')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: '题目检索（知识点/难度/题型/学段）' })
  search(
    @Query('subject') subject?: Subject,
    @Query('stage') stage?: StudyStage,
    @Query('type') type?: QuestionType,
    @Query('difficulty') difficulty?: DifficultyLevel,
    @Query('knowledgePointId') knowledgePointId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ) {
    return this.questionsService.search({ subject, stage, type, difficulty, knowledgePointId, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: '题目详情' })
  detail(@Param('id') id: string) {
    return this.questionsService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '录入题目（管理员/教师）' })
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '更新题目' })
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除题目（仅管理员）' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}