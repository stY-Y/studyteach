import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@teachstudy/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResourcesService } from './resources.service';
import {
  QueryResourceDto,
  ReviewResourceDto,
  UpdateResourceDto,
  UploadResourceDto,
} from './dto/resource.dto';

@ApiTags('共享资源')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: '资源列表（已入库，按开放权限过滤）' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryResourceDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.resourcesService.list(user, query, page, pageSize);
  }

  @Get('mine')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '我的上传资源（教师自主管理）' })
  mine(@CurrentUser() user: AuthUser) {
    return this.resourcesService.myResources(user.id);
  }

  @Get('offline/manifest')
  @ApiOperation({ summary: '我的离线缓存清单' })
  offlineManifest(@CurrentUser() user: AuthUser) {
    return this.resourcesService.offlineManifest(user.id);
  }

  @Post('offline/cache/:id')
  @ApiOperation({ summary: '加入离线缓存（下载后无网访问）' })
  cacheOffline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resourcesService.cacheForOffline(user.id, id);
  }

  @Delete('offline/cache/:id')
  @ApiOperation({ summary: '删除已用缓存，释放本地空间' })
  releaseOffline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resourcesService.releaseOffline(user.id, id);
  }

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传资源（自动转码/压缩/知识点标签匹配，进入校级审核）' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadResourceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.resourcesService.upload(user, dto, file);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: '在线预览（inline 返回，不计下载量）；音视频支持 Range 边下边播' })
  async preview(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filename, buffer, mime } = await this.resourcesService.getPreview(id);
    const total = buffer.length;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);

    // Range 请求：只返回指定字节段，让播放器边下边播、可拖动进度
    const matched = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
    if (matched) {
      const start = matched[1] ? parseInt(matched[1], 10) : 0;
      const end = matched[2] ? parseInt(matched[2], 10) : total - 1;
      const safeEnd = Math.min(end, total - 1);

      if (start > safeEnd || start >= total) {
        res.setHeader('Content-Range', `bytes */${total}`);
        throw new HttpException('请求的字节范围无效', HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
      }

      res.setHeader('Content-Range', `bytes ${start}-${safeEnd}/${total}`);
      res.status(206);
      return new StreamableFile(buffer.subarray(start, safeEnd + 1), { type: mime });
    }

    return new StreamableFile(buffer, { type: mime });
  }

  @Get(':id/download')
  @ApiOperation({ summary: '下载资源（全程免费）' })
  async download(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer, mime } = await this.resourcesService.getDownload(id);
    return new StreamableFile(buffer, {
      type: mime,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
  }

  @Get('pending')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '待审核队列（校级审核 / 平台复核；教师限本校）' })
  pending(@CurrentUser() user: AuthUser) {
    return this.resourcesService.listPending(user);
  }

  @Post(':id/review')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: '双层审核：校级审核（教师/管理员）+ 平台复核（仅管理员）' })
  review(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewResourceDto) {
    return this.resourcesService.review(id, user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '修改资源（标题/开放范围）' })
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateResourceDto) {
    return this.resourcesService.update(id, user, dto);
  }

  @Post(':id/offline')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: '下架资源' })
  offline(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.resourcesService.offline(id, user);
  }
}