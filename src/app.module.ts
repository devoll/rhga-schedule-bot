import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { GoogleSheetsController } from './google-sheets/google-sheets.controller';
import configuration from './config/configuration';
import { ScheduleModule } from './schedule/schedule.module';
import { SyncModule } from './sync/sync.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    GoogleSheetsModule,
    ScheduleModule,
    SyncModule,
    TelegramModule,
  ],
  controllers: [AppController, GoogleSheetsController],
  providers: [AppService],
})
export class AppModule {}
