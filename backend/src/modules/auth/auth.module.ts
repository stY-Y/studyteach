import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SmsCodeService } from './sms-code.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SmsCodeService],
})
export class AuthModule {}