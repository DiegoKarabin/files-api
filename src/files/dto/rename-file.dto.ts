import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenameFileDto {
  @ApiProperty({
    example: 'new-filename',
    description: 'The new name for the file',
  })
  @IsString()
  @IsNotEmpty()
  newName: string;
}
