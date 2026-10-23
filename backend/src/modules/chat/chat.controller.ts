import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { QueryMessagesDto, SendMessageDto } from './dto/chat.dto';

@ApiTags('班级聊天')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  @ApiOperation({ summary: '拉取本班最近消息（需已通过入班审核）' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryMessagesDto) {
    return this.chatService.list(user, query);
  }

  @Post('messages')
  @ApiOperation({ summary: '发送班级消息（最多 500 字）' })
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.chatService.send(user, dto);
  }
}
