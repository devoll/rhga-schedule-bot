import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule, TelegrafModuleOptions } from 'nestjs-telegraf';
import { TelegramUpdate } from './telegram.update';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TelegrafModuleOptions => {
        const botToken = configService.get<string>('telegram.botToken');
        const nodeEnv = configService.get<string>('nodeEnv');
        const domain = configService.get<string>('telegram.domain');
        const webhookPathFromConfig = configService.get<string>(
          'telegram.webhookPath',
        );

        const telegrafOptions: TelegrafModuleOptions = {
          token: botToken,
        };

        if (nodeEnv === 'production' && domain) {
          // Production: use webhook
          // Используем часть токена после последнего ':' как уникальный идентификатор, если webhookPathFromConfig не задан
          const defaultPathSegment = botToken.substring(
            botToken.lastIndexOf(':') + 1,
          );
          const hookPath = webhookPathFromConfig || `/telegraf/${defaultPathSegment}`;

          console.log(
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
          console.log(
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
})
export class TelegramModule {}
