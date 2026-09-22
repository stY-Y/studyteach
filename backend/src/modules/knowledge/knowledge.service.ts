import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyStage, Subject } from '@teachstudy/shared';
import { KnowledgePoint } from './entities/knowledge-point.entity';
import { CreateKnowledgePointDto, UpdateKnowledgePointDto } from './dto/knowledge.dto';

interface KnowledgeNode extends KnowledgePoint {
  children: KnowledgeNode[];
}

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly repo: Repository<KnowledgePoint>,
  ) {}

  list(subject?: Subject, stage?: StudyStage): Promise<KnowledgePoint[]> {
    return this.repo.find({
      where: { ...(subject ? { subject } : {}), ...(stage ? { stage } : {}) },
      order: { subject: 'ASC', order: 'ASC' },
    });
  }

  /** 构建知识点树 */
  async tree(subject?: Subject): Promise<KnowledgeNode[]> {
    const all = await this.repo.find({ order: { order: 'ASC' } });
    const nodes = new Map<string, KnowledgeNode>(
      all.map((k) => [k.id, { ...k, children: [] }]),
    );
    const roots: KnowledgeNode[] = [];
    for (const node of nodes.values()) {
      if (subject && node.subject !== subject) continue;
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findById(id: string): Promise<KnowledgePoint> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('知识点不存在');
    return found;
  }

  create(dto: CreateKnowledgePointDto): Promise<KnowledgePoint> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateKnowledgePointDto): Promise<KnowledgePoint> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}