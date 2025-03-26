import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';
import { HttpService } from '@nestjs/axios';
import { async, firstValueFrom } from 'rxjs';
import { User } from 'src/users/entities/user.entity';
import { FilesService } from 'src/files/files.service';
import axios from 'axios';

interface UnsplashPhoto {
  id: string;
  description: string | null;
  urls: {
    regular: string;
    thumb: string;
  };
  links: {
    download: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
}

@Injectable()
export class UnsplashService {
  private readonly unsplash;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly filesService: FilesService,
  ) {
    const accessKey = this.configService.get<string>('UNSPLASH_ACCESS_KEY');

    if (!accessKey) {
      throw new InternalServerErrorException('Unsplash access key is not configured');
    }

    this.unsplash = createApi({
      accessKey,
      fetch: nodeFetch as unknown as typeof fetch,
    });
  }

  async searchPhotos(query: string, page = 1, perPage = 10) {
    try {
      const result = await this.unsplash.search.getPhotos({
        query,
        page,
        perPage,
      });

      if (result.errors) {
        throw new InternalServerErrorException(result.errors[0]);
      }

      return result.response;
    } catch (error) {
      throw new InternalServerErrorException('Failed to search photos: ' + error.message);
    }
  }

  async getPhoto(photoId: string) {
    try {
      const result = await this.unsplash.photos.get({ photoId });

      if (result.errors) {
        throw new InternalServerErrorException(result.errors[0]);
      }

      return result.response;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get photo: ' + error.message);
    }
  }

  async savePhoto(photoId: string, user: User) {
    try {
      const photo = await this.getPhoto(photoId);

      if (!photo) {
        throw new InternalServerErrorException('Photo not found');
      }

      const response = await axios.get(photo.urls.raw, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data);
      const filename = `unsplash-${Date.now()}.jpg`;

      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      return this.filesService.create(file, user);
    } catch (error) {
      throw new BadRequestException(
        `Failed to save Unsplash photo: ${error.message}`,
      );
    }
  }
}
