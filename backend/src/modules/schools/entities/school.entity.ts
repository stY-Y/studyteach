import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 学校：资源「仅本校可见」、教师限本校审核、学生档案归属都依赖它。
 * 项目按公益定位先做轻量版：名称 + 地区 + 类型，够用且不引入复杂机构树。
 */
@Entity('schools')
export class School {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  name: string;

  /** 地区：省 / 市 / 县，如「云南省 曲靖市 会泽县」 */
  @Column({ type: 'varchar', length: 128, nullable: true })
  region: string | null;

  /** 类型：小学 / 初中 / 九年一贯制 / 完全中学 / 高中 */
  @Column({ type: 'varchar', length: 32, nullable: true })
  type: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
