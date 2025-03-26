import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';


@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('Missing required AWS configuration');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.bucket = bucket;
  }

  async uploadFile(file: Express.Multer.File, userId: string): Promise<string> {
    try {
      const key = `${userId}/${uuidv4()}-${file.originalname}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return key;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file to S3: ${error.message}`,
      );
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${error.message}`,
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file from S3: ${error.message}`,
      );
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: encodeURIComponent(`${this.bucket}/${sourceKey}`),
          Key: destinationKey,
        })
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to copy file in S3: ${error.message}`,
      );
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        throw new InternalServerErrorException('Response body is undefined');
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as ReadableStream;
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to download file from S3: ${error.message}`,
      );
    }
  }

  async getFileStream(key: string): Promise<{
    stream: Readable;
    contentType: string;
    contentLength: number;
  }> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.ContentType || !response.ContentLength) {
        throw new InternalServerErrorException('Missing content type or length in response');
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to get file stream from S3: ${error.message}`,
      );
    }
  }
}
