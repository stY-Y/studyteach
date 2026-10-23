import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/school.dto';

@Injectable()
export class SchoolsService {
  constructor(@InjectRepository(School) private readonly repo: Repository<School>) {}

  /** 学校列表（登录用户均可查看，用于档案选择与账号创建） */
  list(): Promise<School[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  /** 管理员：新增学校 */
  create(dto: CreateSchoolDto): Promise<School> {
    return this.repo.save(this.repo.create(dto));
  }
}
