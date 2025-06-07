import { Controller, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service'; // Путь изменится при переносе

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('sheet-to-db')
  async syncSheetToDb(@Query('sheetName') sheetNameParam?: string) {
    return this.syncService.syncSheetToDb(sheetNameParam);
  }
}
