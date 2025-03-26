import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SavePhotoDto {
  @ApiProperty({
    example: 'yihlaRCCvd4',
    description: 'The ID of the Unsplash photo to save',
  })
  @IsString()
  @IsNotEmpty()
  photoId: string;
}
