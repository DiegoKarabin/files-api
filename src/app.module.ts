import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { FilesModule } from 'src/files/files.module';
import { UnsplashModule } from 'src/unsplash/unsplash.module';
import { configValidationSchema } from 'src/config/config.schema';
import { DatabaseConfig } from 'src/config/database.config';
import { MailModule } from 'src/mail/mail.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),
    AuthModule,
    UsersModule,
    FilesModule,
    UnsplashModule,
    MailModule,
  ],
})
export class AppModule {}
