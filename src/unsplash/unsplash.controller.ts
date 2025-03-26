import { Controller, Get, Post, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UnsplashService } from 'src/unsplash/unsplash.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { SavePhotoDto } from 'src/unsplash/dto/save-photo.dto';

@ApiTags('unsplash')
@Controller('unsplash')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UnsplashController {
  constructor(private readonly unsplashService: UnsplashService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search Unsplash photos' })
  @ApiResponse({ status: 200, description: 'Return search results' })
  @ApiQuery({ name: 'query', required: true, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'perPage', required: false, description: 'Items per page (default: 10)' })
  async searchPhotos(
    @Query('query') query: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.unsplashService.searchPhotos(query, page, perPage);
  }

  @Post('save')
  @ApiOperation({ summary: 'Save an Unsplash photo' })
  @ApiResponse({ status: 201, description: 'Photo saved successfully' })
  async savePhoto(
    @Body() savePhotoDto: SavePhotoDto,
    @Request() req: RequestWithUser,
  ) {
    return this.unsplashService.savePhoto(savePhotoDto.photoId, req.user);
  }
}
