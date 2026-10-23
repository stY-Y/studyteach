import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SmsCodeService } from './sms-code.service';
import { LoginLog } from './entities/login-log.entity';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([LoginLog])],
  controllers: [AuthController],
  providers: [AuthService, SmsCodeService],
})
export class AuthModule {}