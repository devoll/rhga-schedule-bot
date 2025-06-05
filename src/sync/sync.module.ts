import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module'; // Путь изменится при переносе
import { ScheduleModule } from '../schedule/schedule.module'; // Путь изменится при переносе
import { SyncController } from './sync.controller'; // Путь изменится при переносе

@Module({
  imports: [
    ConfigModule, // Убедитесь, что ConfigModule глобальный или экспортируется из AppModule
    GoogleSheetsModule, // Предоставляет GoogleSheetsService
    ScheduleModule,     // Предоставляет ScheduleService
  ],
  controllers: [SyncController],
})
export class SyncModule {}
