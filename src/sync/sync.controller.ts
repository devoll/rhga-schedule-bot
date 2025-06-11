import {
  Controller, Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs'; // Путь изменится при переносе

@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly httpService: HttpService,
  ) {}

  @Post('sheet-to-db')
  async syncSheetToDb(@Query('sheetName') sheetNameParam?: string) {
    return this.syncService.syncSheetToDb(sheetNameParam).catch((error) => {
      throw new HttpException(
        `Failed to sync sheet '${sheetNameParam}': ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  }

  @Get('fetch')
  async fetch(@Query('url') url: string) {
    if(!url) {
      return 'need to pass url query';
    }
    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: 'text', timeout: 10_000 }),
    );
    return response.data;
  }
}
