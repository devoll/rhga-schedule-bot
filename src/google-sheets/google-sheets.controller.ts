import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleSheetsService } from './google-sheets.service';

@Controller('google-sheets')
export class GoogleSheetsController {
  private readonly spreadsheetId: string;
  private readonly defaultSheet: string;

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly configService: ConfigService,
  ) {
    this.spreadsheetId = this.configService.getOrThrow<string>(
      'GOOGLE_SHEETS_SPREADSHEET_ID',
    );
    this.defaultSheet = this.configService.get<string>(
      'GOOGLE_DEFAULT_SHEET_NAME',
    );
  }

  @Get('sheet')
  async getSheetData(@Query('sheetName') sheetName?: string) {
    try {
      const targetSheet = sheetName || this.defaultSheet;
      return await this.googleSheetsService.getSheetData(
        this.spreadsheetId,
        targetSheet,
      );
    } catch (error) {
      return { error: error.message };
    }
  }

  @Get('all-sheets')
  async getAllSheetsData(@Query('sheetNames') sheetNames?: string) {
    try {
      const sheets = sheetNames
        ? sheetNames.split(',').map((s) => s.trim())
        : [this.defaultSheet];

      return await this.googleSheetsService.getAllSheetsData(
        this.spreadsheetId,
        sheets,
      );
    } catch (error) {
      return { error: error.message };
    }
  }
}
