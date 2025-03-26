import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from 'src/files/entities/file.entity';
import { S3Service } from 'src/files/s3.service';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
    private readonly s3Service: S3Service,
  ) {}

  async create(file: Express.Multer.File, user: User): Promise<File> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const key = await this.s3Service.uploadFile(file, user.id);

    const newFile = this.filesRepository.create({
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: key,
      userId: user.id,
    });

    return this.filesRepository.save(newFile);
  }

  async findAll(userId: string): Promise<File[]> {
    return this.filesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<File> {
    const file = await this.filesRepository.findOne({
      where: { id, userId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async remove(id: string, userId: string): Promise<void> {
    const file = await this.findOne(id, userId);
    await this.s3Service.deleteFile(file.path);

    const result = await this.filesRepository.delete({ id, userId });

    if (result.affected === 0) {
      throw new NotFoundException('File not found');
    }
  }

  async rename(id: string, userId: string, newName: string): Promise<File> {
    const file = await this.findOne(id, userId);

    const extension = file.filename.split('.').pop();
    const newFilename = `${newName}.${extension}`;

    const newKey = file.path.replace(file.filename, newFilename);

    await this.s3Service.copyFile(file.path, newKey);

    await this.s3Service.deleteFile(file.path);

    file.filename = newFilename;
    file.path = newKey;

    return this.filesRepository.save(file);
  }

  async download(id: string, userId: string): Promise<Buffer> {
    const file = await this.findOne(id, userId);
    return this.s3Service.downloadFile(file.path);
  }

  async getSignedUrl(id: string, userId: string): Promise<string> {
    const file = await this.findOne(id, userId);
    return this.s3Service.getSignedUrl(file.path);
  }
}
