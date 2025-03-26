import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { User } from 'src/users/entities/user.entity';
import { SendTemplatedEmailOptions } from './interfaces/mail-template.interface';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private templates: { [key: string]: HandlebarsTemplateDelegate } = {};

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_SECURE') === 1,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });

    this.loadTemplates();
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, 'templates');

    fs.readdirSync(templatesDir)
      .filter(file => file.endsWith('.hbs'))
      .forEach(file => {
        const templateContent = fs.readFileSync(
          path.join(templatesDir, file),
          'utf-8'
        );
        const templateName = file.replace('.hbs', '');
        this.templates[templateName] = handlebars.compile(templateContent);
      });
  }

  async sendTemplatedEmail(options: SendTemplatedEmailOptions) {
    const { to, subject, template, context } = options;

    if (!this.templates[template]) {
      throw new Error(`Template ${template} not found`);
    }

    const html = this.templates[template](context);

    return this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM'),
      to,
      subject,
      html,
    });
  }

  async sendResetPassword(user: User, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    await this.sendTemplatedEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: {
        name: user.displayName || user.email,
        resetUrl,
      },
    });
  }
}
