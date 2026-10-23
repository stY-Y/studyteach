import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { EnrollmentPolicy } from './entities/enrollment-policy.entity';
import { UpsertEnrollmentPolicyDto } from './dto/enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(EnrollmentPolicy)
    private readonly repo: Repository<EnrollmentPolicy>,
  ) {}

  list(year?: number, category?: string): Promise<EnrollmentPolicy[]> {
    return this.repo.find({
      where: { ...(year ? { year } : {}), ...(category ? { category } : {}) },
      order: { year: 'DESC', createdAt: 'DESC' },
    });
  }

  /** 年度同步更新：同一年份/地区/类别做 upsert */
  async upsert(dto: UpsertEnrollmentPolicyDto): Promise<EnrollmentPolicy> {
    // region 可空，TypeORM 的 where 不接受 null，按有无地区分别查询
    const where: FindOptionsWhere<EnrollmentPolicy> = { year: dto.year, category: dto.category };
    if (dto.region) where.region = dto.region;

    const existing = await this.repo.findOne({ where });
    if (existing) {
      existing.title = dto.title;
      existing.content = dto.content;
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create(dto));
  }
}