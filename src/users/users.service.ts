import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { MoreThan } from 'typeorm';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private mailService: MailService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);

    return savedUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['files'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    const updateData: Partial<User> = {};

    if (updateUserDto.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }

      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.displayName !== undefined) {
      updateData.displayName = updateUserDto.displayName;
    }

    if (Object.keys(updateData).length > 0) {
      await this.usersRepository.update(id, updateData);
    }

    return this.findById(id);
  }

  async setRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hashedToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : undefined;
    await this.usersRepository.update(userId, {
      refreshToken: hashedToken,
    });
  }

  async setResetPasswordToken(email: string): Promise<string> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = Math.random().toString(36).slice(-8);
    const resetPasswordExpires = new Date();

    resetPasswordExpires.setHours(resetPasswordExpires.getHours() + 1);

    await this.usersRepository.update(user.id, {
      resetPasswordToken: await bcrypt.hash(resetToken, 10),
      resetPasswordExpires,
    });

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { resetPasswordExpires: MoreThan(new Date()) },
    });

    if (!user || !user.resetPasswordToken || !(await bcrypt.compare(token, user.resetPasswordToken))) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersRepository.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });
  }
}
