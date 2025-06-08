import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { SyncService } from './sync.service'; // Путь изменится при переносе

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('sheet-to-db')
  async syncSheetToDb(@Query('sheetName') sheetNameParam?: string) {
    return this.syncService.syncSheetToDb(sheetNameParam).catch((error) => {
      throw new HttpException(
        `Failed to sync sheet '${sheetNameParam}': ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  }
}
