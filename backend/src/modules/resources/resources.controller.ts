import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
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

  @Get(':id/download')
  @ApiOperation({ summary: '下载资源（全程免费）' })
  async download(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer, mime } = await this.resourcesService.getDownload(id);
    return new StreamableFile(buffer, {
      type: mime,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
  }

  @Post(':id/review')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '双层审核：校级审核 + 平台复核（管理员）' })
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