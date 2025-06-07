import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module'; // Путь изменится при переносе
import { TimetableModule } from '../timetable/timetable.module'; // Путь изменится при переносе
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service'; // Путь изменится при переносе

@Module({
  imports: [
    ConfigModule, // Убедитесь, что ConfigModule глобальный или экспортируется из AppModule
    GoogleSheetsModule, // Предоставляет GoogleSheetsService
    TimetableModule, // Предоставляет TimetableService
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule implements OnModuleInit {

  constructor(private readonly syncService: SyncService) {
  }
  async onModuleInit() {
    await this.syncService.syncSheetToDb();
  }
}
