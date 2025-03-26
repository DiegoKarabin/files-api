import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
  Put,
  Body,
  StreamableFile,
  Response,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response as ExpressResponse } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesService } from 'src/files/files.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { File } from 'src/files/entities/file.entity';
import { RenameFileDto } from './dto/rename-file.dto';
import { S3Service } from 'src/files/s3.service';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ): Promise<File> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.filesService.create(file, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files' })
  @ApiResponse({ status: 200, description: 'Return all files' })
  async findAll(@Request() req: RequestWithUser): Promise<File[]> {
    return this.filesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a file by id' })
  @ApiResponse({ status: 200, description: 'Return the file' })
  async findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<File> {
    return this.filesService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async remove(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    return this.filesService.remove(id, req.user.id);
  }

  @Put(':id/rename')
  @ApiOperation({ summary: 'Rename a file' })
  @ApiResponse({ status: 200, description: 'File renamed successfully' })
  async renameFile(
    @Param('id') id: string,
    @Body() renameFileDto: RenameFileDto,
    @Request() req: RequestWithUser,
  ): Promise<File> {
    return this.filesService.rename(id, req.user.id, renameFileDto.newName);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, description: 'Streams the file as a download' })
  async downloadFile(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Response() res: ExpressResponse,
  ) {
    const file = await this.filesService.findOne(id, req.user.id);
    const { stream, contentType, contentLength } = await this.s3Service.getFileStream(file.path);

    res.set({
      'Content-Type': contentType || file.mimeType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': contentLength,
    });

    stream.pipe(res);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get a temporary URL for the file' })
  @ApiResponse({ status: 200, description: 'Returns a signed URL for the file' })
  async getSignedUrl(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ url: string }> {
    const url = await this.filesService.getSignedUrl(id, req.user.id);

    return { url };
  }
}
