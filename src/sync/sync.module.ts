import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module'; // Путь изменится при переносе
import { TimetableModule } from '../timetable/timetable.module'; // Путь изменится при переносе
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { HttpModule } from '@nestjs/axios'; // Путь изменится при переносе
import { Agent as HttpsAgent } from 'https';

@Module({
  imports: [
    ConfigModule, // Убедитесь, что ConfigModule глобальный или экспортируется из AppModule
    GoogleSheetsModule, // Предоставляет GoogleSheetsService
    TimetableModule, // Предоставляет TimetableService
    HttpModule.registerAsync({
      useFactory: () => {
        const agent = new HttpsAgent({
          family: 4,
          timeout: 30_000,
        });
        return {
          timeout: 30_000,
          httpsAgent: agent,
          headers: { 'User-Agent': 'NestJS/GoogleDocsFetcher' },
        };
      },
    }),
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule implements OnModuleInit {
  constructor(private readonly syncService: SyncService) {}
  async onModuleInit() {
    await this.syncService.cronSync();
  }
}
