import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DiagnosisService } from '../diagnosis/diagnosis.service';
import { GradingService } from '../grading/grading.service';

@Injectable()
export class SchoolHomeService {
  constructor(
    private readonly usersService: UsersService,
    private readonly diagnosisService: DiagnosisService,
    private readonly gradingService: GradingService,
  ) {}

  /** 家长实时查看已绑定学生的学情进度（解决外出务工家长家校沟通缺位） */
  async childrenProgress(parentId: string) {
    const links = await this.usersService.listChildren(parentId);
    const children: Array<Record<string, unknown>> = [];

    for (const link of links) {
      const student = await this.usersService.findById(link.studentUserId);
      const [diagnoses, gradings] = await Promise.all([
        this.diagnosisService.listByStudent(link.studentUserId),
        this.gradingService.listByStudent(link.studentUserId),
      ]);
      const latest = diagnoses[0];
      children.push({
        student: { id: student?.id, name: student?.name, username: student?.username },
        diagnosisCount: diagnoses.length,
        gradingCount: gradings.length,
        latestWeakPoints: latest?.weakPoints ?? [],
        latestLearningPath: latest?.learningPath ?? [],
        updatedAt: latest?.updatedAt ?? null,
      });
    }

    return children;
  }
}