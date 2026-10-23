import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from '../users/entities/student-profile.entity';

/** 班级摘要：以「学校 + 年级 + 班级名」三元组标识一个班 */
export interface ClassSummary {
  schoolId: string;
  grade: string;
  className: string;
  studentCount: number;
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly profiles: Repository<StudentProfile>,
  ) {}

  /**
   * 班级列表：从学生档案聚合而来（无需单独维护班级表）。
   * 供注册选班、教师布置作业、班级聊天选班使用。
   */
  async list(schoolId?: string): Promise<ClassSummary[]> {
    const qb = this.profiles
      .createQueryBuilder('p')
      .select('p.schoolId', 'schoolId')
      .addSelect('p.grade', 'grade')
      .addSelect('p.className', 'className')
      .addSelect('COUNT(*)', 'studentCount')
      .where('p.schoolId IS NOT NULL')
      .andWhere('p.grade IS NOT NULL')
      .andWhere('p.className IS NOT NULL')
      .andWhere("p.className <> ''")
      .groupBy('p.schoolId')
      .addGroupBy('p.grade')
      .addGroupBy('p.className')
      .orderBy('p.grade', 'ASC')
      .addOrderBy('p.className', 'ASC');

    if (schoolId) qb.andWhere('p.schoolId = :schoolId', { schoolId });

    const rows = await qb.getRawMany<{
      schoolId: string;
      grade: string;
      className: string;
      studentCount: string | number;
    }>();

    return rows.map((r) => ({
      schoolId: r.schoolId,
      grade: r.grade,
      className: r.className,
      studentCount: Number(r.studentCount),
    }));
  }
}
