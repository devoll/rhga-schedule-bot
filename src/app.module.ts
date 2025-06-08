import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { GoogleSheetsController } from './google-sheets/google-sheets.controller';
import { TimetableModule } from './timetable/timetable.module';
import { SyncModule } from './sync/sync.module';
import { TelegramModule } from './telegram/telegram.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('SQLITE_PATH'),
        // eslint-disable-next-line no-undef
        entities: [join(__dirname, '**', '*.entity{.ts,.js}')],
        synchronize: true,
        // autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    GoogleSheetsModule,
    TimetableModule,
    SyncModule,
    TelegramModule,
  ],
  controllers: [AppController, GoogleSheetsController],
  providers: [AppService],
})
export class AppModule {}
