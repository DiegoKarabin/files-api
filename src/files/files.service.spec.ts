import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FilesService } from 'src/files/files.service';
import { S3Service } from 'src/files/s3.service';
import { File } from 'src/files/entities/file.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

describe('FilesService', () => {
  let service: FilesService;
  let s3Service: S3Service;
  let repository: Repository<File>;

  const mockFile = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test'),
    size: 4,
  } as Express.Multer.File;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(File),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getFileStream: jest.fn(),
            getSignedUrl: jest.fn(),
            copyFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    s3Service = module.get<S3Service>(S3Service);
    repository = module.get<Repository<File>>(getRepositoryToken(File));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a file record', async () => {
      const s3Key = 'test-key';
      const newFile = {
        id: '1',
        filename: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        path: s3Key,
        userId: mockUser.id,
      } as File;

      jest.spyOn(s3Service, 'uploadFile').mockResolvedValue(s3Key);
      jest.spyOn(repository, 'create').mockReturnValue(newFile);
      jest.spyOn(repository, 'save').mockResolvedValue(newFile);

      const result = await service.create(mockFile, mockUser);

      expect(result).toEqual(newFile);
      expect(s3Service.uploadFile).toHaveBeenCalledWith(mockFile, mockUser.id);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all files for a user', async () => {
      const files = [
        { id: '1', filename: 'test1.jpg' } as File,
        { id: '2', filename: 'test2.jpg' } as File,
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(files);

      const result = await service.findAll(mockUser.id);

      expect(result).toEqual(files);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single file', async () => {
      const file = { id: '1', filename: 'test.jpg' } as File;

      jest.spyOn(repository, 'findOne').mockResolvedValue(file);

      const result = await service.findOne('1', mockUser.id);

      expect(result).toEqual(file);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1', userId: mockUser.id },
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('1', mockUser.id)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should delete a file', async () => {
      const file = { id: '1', filename: 'test.jpg', path: 's3-key' } as File;

      jest.spyOn(repository, 'findOne').mockResolvedValue(file);
      jest.spyOn(s3Service, 'deleteFile').mockResolvedValue(undefined);
      jest.spyOn(repository, 'delete').mockResolvedValue({ raw: [], affected: 1 });

      await service.remove('1', mockUser.id);

      expect(s3Service.deleteFile).toHaveBeenCalledWith(file.path);
      expect(repository.delete).toHaveBeenCalledWith({
        id: '1',
        userId: mockUser.id,
      });
    });
  });

  describe('rename', () => {
    it('should rename a file', async () => {
      const file = {
        id: '1',
        filename: 'old.jpg',
        path: 'old-key.jpg',
      } as File;
      const newName = 'new';
      const newFilename = 'new.jpg';
      const newKey = 'new-key.jpg';

      jest.spyOn(repository, 'findOne').mockResolvedValue(file);
      jest.spyOn(s3Service, 'copyFile').mockResolvedValue(undefined);
      jest.spyOn(s3Service, 'deleteFile').mockResolvedValue(undefined);
      jest.spyOn(repository, 'save').mockResolvedValue({
        id: '1',
        filename: newFilename,
        path: newKey,
        mimeType: 'image/jpeg',
        size: 1000,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      } as File);

      const result = await service.rename('1', mockUser.id, newName);

      expect(result.filename).toBe(newFilename);
      expect(s3Service.copyFile).toHaveBeenCalled();
      expect(s3Service.deleteFile).toHaveBeenCalled();
    });
  });
});
