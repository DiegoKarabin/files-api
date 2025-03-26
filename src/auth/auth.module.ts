import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
import { AuthController } from 'src/auth/auth.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { GoogleStrategy } from 'src/auth/strategies/google.strategy';
import { LocalStrategy } from 'src/auth/strategies/local.strategy';
import { MailModule } from 'src/mail/mail.module';
import { jwtConstants } from 'src/auth/constants';

@Module({
  imports: [
    UsersModule,
    MailModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
