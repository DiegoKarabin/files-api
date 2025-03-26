import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      type: 'postgres',
      url: this.configService.get<string>('DATABASE_URL'),
      autoLoadEntities: true,
      synchronize: !isProduction,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    };
  }
}
