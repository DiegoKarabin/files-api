import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from 'src/files/files.service';
import { FilesController } from 'src/files/files.controller';
import { File } from 'src/files/entities/file.entity';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from 'src/files/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    ConfigModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, S3Service],
  exports: [FilesService],
})
export class FilesModule {}
