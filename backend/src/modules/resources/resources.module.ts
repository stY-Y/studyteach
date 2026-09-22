import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ReviewRecord } from './entities/review-record.entity';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Resource, ReviewRecord])],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}