import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from './interfaces/auth.interface';

interface TokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    public readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }

    return null;
  }

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.usersService.create(createUserDto);

    return {
      user,
      accessToken: this.generateToken(user),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user,
      accessToken: this.generateToken(user),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = await this.usersService.setResetPasswordToken(email);

    await this.mailService.sendResetPassword(user, resetToken);
  }

  async resetPassword(token: string, newPassword: string) {
    await this.usersService.resetPassword(token, newPassword);
  }

  async validateOAuthUser(profile: { email: string; displayName: string; accessToken: string }) {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        displayName: profile.displayName,
      });
    }

    return user;
  }

  private generateToken(user: User): string {
    const payload: TokenPayload = { sub: user.id, email: user.email };

    return this.jwtService.sign(payload);
  }
}
