import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule, TelegrafModuleOptions } from 'nestjs-telegraf';
import { TelegramUpdate } from './telegram.update';
import { TimetableModule } from '../timetable/timetable.module';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [
    ConfigModule,
    TimetableModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TelegrafModuleOptions => {
        const botToken = configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
        const nodeEnv = configService.get<string>('NODE_ENV');
        const domain = configService.get<string>('TELEGRAM_DOMAIN');

        const telegrafOptions: TelegrafModuleOptions = {
          token: botToken,
        };

        if (nodeEnv === 'production' && domain) {
          // Production: use webhook
          // Используем часть токена после последнего ':' как уникальный идентификатор, если webhookPathFromConfig не задан
          const hookPath = '/telegram/webhook';

          const logger = new Logger('TelegramModule');
          logger.log(
            `Production mode: Setting up Telegraf webhook for domain ${domain} and path ${hookPath}`,
          );
          telegrafOptions.launchOptions = {
            webhook: {
              domain: domain,
              hookPath: hookPath,
            },
          };
        } else {
          // Development or missing domain: use long polling
          const logger = new Logger('TelegramModule');
          logger.log(
            'Development mode or no TELEGRAM_DOMAIN: Using Telegraf long polling.',
          );
          // telegrafOptions.launchOptions = false; // Explicitly disable webhook
        }
        return telegrafOptions;
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TelegramUpdate],
  controllers: [TelegramController],
})
export class TelegramModule {}
