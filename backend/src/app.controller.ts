import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('system')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  health() {
    return { status: 'ok', service: 'teachstudy', time: new Date().toISOString() };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: '服务信息' })
  root() {
    return {
      name: '乡村公益助学平台',
      motto: '纯公益 · 全免费 · 无广告 · 无付费墙',
      docs: '/docs',
    };
  }
}