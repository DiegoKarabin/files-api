import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let service: S3Service;
  let mockS3Client: jest.Mocked<S3Client>;

  beforeEach(async () => {
    mockS3Client = {
      send: jest.fn(),
    } as any;

    (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              switch (key) {
                case 'AWS_REGION':
                  return 'us-east-1';
                case 'AWS_ACCESS_KEY_ID':
                  return 'test-key';
                case 'AWS_SECRET_ACCESS_KEY':
                  return 'test-secret';
                case 'AWS_S3_BUCKET':
                  return 'test-bucket';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  describe('uploadFile', () => {
    it('should upload a file to S3', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const mockUserId = '123';

      mockS3Client.send.mockResolvedValueOnce({} as never);

      const result = await service.uploadFile(mockFile, mockUserId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand)
      );
    });
  });

  describe('getFileStream', () => {
    it('should get a file stream from S3', async () => {
      const mockStream = {
        Body: {
          transformToWebStream: jest.fn(),
        },
        ContentType: 'image/jpeg',
        ContentLength: 100,
      };

      mockS3Client.send.mockResolvedValueOnce(mockStream as never);

      const result = await service.getFileStream('test-key');

      expect(result.stream).toBeDefined();
      expect(result.contentType).toBe('image/jpeg');
      expect(result.contentLength).toBe(100);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(GetObjectCommand)
      );
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL', async () => {
      const mockUrl = 'https://test-url.com';
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(mockUrl);

      const result = await service.getSignedUrl('test-key');

      expect(result).toBe(mockUrl);
    });
  });
});
