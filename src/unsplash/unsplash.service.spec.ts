import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { UnsplashService } from 'src/unsplash/unsplash.service';
import { FilesService } from 'src/files/files.service';
import { createApi } from 'unsplash-js';
import axios from 'axios';
import { createMockUser } from 'src/test/test-utils';
import { User } from 'src/users/entities/user.entity';

// Mock axios
jest.mock('axios');
jest.mock('unsplash-js', () => ({
  createApi: jest.fn(),
}));

describe('UnsplashService', () => {
  let service: UnsplashService;
  let filesService: FilesService;
  let httpService: HttpService;
  let mockUnsplashApi: any;
  const mockUser = createMockUser();

  beforeEach(async () => {
    // Create mock Unsplash API
    mockUnsplashApi = {
      search: {
        getPhotos: jest.fn(),
      },
      photos: {
        get: jest.fn(),
      },
    };

    // Set up the mock implementation
    (createApi as jest.Mock).mockReturnValue(mockUnsplashApi);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnsplashService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'test-access-key'),
          },
        },
        {
          provide: FilesService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UnsplashService>(UnsplashService);
    filesService = module.get<FilesService>(FilesService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchPhotos', () => {
    it('should search for photos', async () => {
      const mockResults = {
        results: [
          { id: '1', urls: { regular: 'https://example.com/1.jpg' } },
          { id: '2', urls: { regular: 'https://example.com/2.jpg' } },
        ]
      };

      mockUnsplashApi.search.getPhotos.mockResolvedValueOnce({
        type: 'success',
        response: mockResults,
      });

      const result = await service.searchPhotos('nature', 1, 10);

      expect(result).toEqual(mockResults);
      expect(mockUnsplashApi.search.getPhotos).toHaveBeenCalledWith({
        query: 'nature',
        page: 1,
        perPage: 10,
      });
    });

    it('should handle search errors', async () => {
      mockUnsplashApi.search.getPhotos.mockResolvedValueOnce({
        type: 'error',
        errors: ['API error'],
      });

      await expect(service.searchPhotos('nature', 1, 10)).rejects.toThrow(
        'Failed to search photos: API error'
      );
    });
  });

  describe('savePhoto', () => {
    it('should save an Unsplash photo', async () => {
      const photoId = 'abc123';
      const mockPhotoUrl = 'https://example.com/photo.jpg';
      const mockPhotoBuffer = Buffer.from('mock photo data');

      mockUnsplashApi.photos.get.mockResolvedValueOnce({
        type: 'success',
        response: {
          urls: { raw: mockPhotoUrl },
        },
      });

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: mockPhotoBuffer,
        headers: { 'content-type': 'image/jpeg' },
      });

      const expectedFile = {
        fieldname: 'file',
        originalname: `unsplash-${Date.now()}.jpg`,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: mockPhotoBuffer,
        size: mockPhotoBuffer.length,
      };

      await service.savePhoto(photoId, mockUser as User);

      expect(filesService.create).toHaveBeenCalledWith(
        expectedFile,
        mockUser
      );
    });

    it('should handle save errors', async () => {
      const photoId = 'invalid-id';

      mockUnsplashApi.photos.get.mockResolvedValueOnce({
        type: 'error',
        errors: ['Not found'],
      });

      await expect(service.savePhoto(photoId, mockUser as User)).rejects.toThrow(
        'Failed to save Unsplash photo: Failed to get photo: Not found'
      );
    });

    it('should handle download errors', async () => {
      const photoId = 'abc123';
      const mockPhotoUrl = 'https://example.com/photo.jpg';

      mockUnsplashApi.photos.get.mockResolvedValueOnce({
        type: 'success',
        response: {
          urls: { regular: mockPhotoUrl },
        },
      });

      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.savePhoto(photoId, mockUser as User)).rejects.toThrow(
        'Failed to save Unsplash photo: Network error'
      );
    });
  });
});
