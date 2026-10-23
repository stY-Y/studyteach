import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParentChatService } from './parent-chat.service';
import { QueryParentMessagesDto, SendParentMessageDto } from './dto/parent-chat.dto';

@ApiTags('家长沟通')
@Controller('parent-chat')
export class ParentChatController {
  constructor(private readonly parentChatService: ParentChatService) {}

  @Get('threads')
  @Roles(UserRole.PARENT, UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '沟通会话列表（家长：孩子班主任；教师：本班家长）' })
  threads(@CurrentUser() user: AuthUser) {
    return this.parentChatService.threads(user);
  }

  @Get('messages')
  @Roles(UserRole.PARENT, UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '会话消息（家长仅限本人；教师仅限本班）' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryParentMessagesDto) {
    return this.parentChatService.list(user, query);
  }

  @Post('messages')
  @Roles(UserRole.PARENT, UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '发送沟通消息（家长发给班主任 / 教师回复家长）' })
  send(@CurrentUser() user: AuthUser, @Body() dto: SendParentMessageDto) {
    return this.parentChatService.send(user, dto);
  }
}
