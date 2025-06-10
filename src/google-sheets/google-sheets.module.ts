import { Module } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 секунд таймаут
      maxRedirects: 5, // Максимальное количество редиректов
      validateStatus: (status) => status < 500, // Принимаем любые статусы кроме 5xx
    }),
  ],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
