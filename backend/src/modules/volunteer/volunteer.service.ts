import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VolunteerPlan } from './entities/volunteer-plan.entity';
import { College } from './entities/college.entity';
import { MatchVolunteerDto } from './dto/volunteer.dto';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class VolunteerService {
  constructor(
    @InjectRepository(VolunteerPlan) private readonly planRepo: Repository<VolunteerPlan>,
    @InjectRepository(College) private readonly collegeRepo: Repository<College>,
    private readonly ai: AiService,
  ) {}

  /** 根据分数/位次/选科生成「冲稳保」志愿方案，标注报考限制 */
  async match(studentId: string, dto: MatchVolunteerDto): Promise<VolunteerPlan> {
    const result = await this.ai.matchVolunteer(dto);
    return this.planRepo.save(
      this.planRepo.create({
        studentId,
        score: dto.score,
        rank: dto.rank,
        subjects: dto.subjects,
        plans: result.plans,
      }),
    );
  }

  listByStudent(studentId: string): Promise<VolunteerPlan[]> {
    return this.planRepo.find({ where: { studentId }, order: { createdAt: 'DESC' } });
  }

  /** 院校库（每年同步更新投档线/选科要求） */
  listColleges(year?: number): Promise<College[]> {
    return this.collegeRepo.find({ where: year ? { year } : {}, order: { minRank: 'ASC' } });
  }
}