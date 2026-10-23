import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), ClassesModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
