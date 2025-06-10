import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { TimetableService } from '../timetable/timetable.service';
import { ConfigService } from '@nestjs/config';
import { TimetableItemDto } from '../timetable/timetable-item.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly spreadsheetId: string;
  private readonly defaultSheetName: string;

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly scheduleService: TimetableService,
    private readonly configService: ConfigService,
  ) {
    this.spreadsheetId = this.configService.getOrThrow<string>(
      'GOOGLE_SHEETS_SPREADSHEET_ID',
    );
    this.defaultSheetName = this.configService.get<string>(
      'GOOGLE_DEFAULT_SHEET_NAME',
    );
  }

  @Cron('0 0 */1 * * *')
  async cronSync() {
    try {
      await this.syncSheetToDb();
      this.logger.log('Синхронизация успешно завершена');
    } catch (error) {
      // Более детальная обработка ошибок
      let errorMessage = error.message || 'Неизвестная ошибка';
      let errorDetails: any = {
        message: errorMessage,
        stack: error.stack,
      };

      // Если ошибка содержит вложенные ошибки (например, из axios)
      if (error.response) {
        errorDetails.response = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        };
      }

      if (error.request) {
        errorDetails.request = {
          method: error.request.method,
          path: error.request.path,
          host: error.request.host,
        };
      }

      if (error.code) {
        errorDetails.code = error.code;
      }

      this.logger.error({
        message: `Ошибка при синхронизации с Google Sheets`,
        error: errorDetails,
        raw: JSON.stringify(error),
      });
    }
  }

  async syncSheetToDb(sheetNameParam?: string) {
    {
      if (!this.spreadsheetId) {
        throw new HttpException(
          'Spreadsheet ID is not configured. Cannot sync.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      const sheetNameToSync = sheetNameParam || this.defaultSheetName;
      if (!sheetNameToSync) {
        throw new HttpException(
          'Sheet name is not provided and no default is set in config.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Starting sync for sheet: '${sheetNameToSync}' from spreadsheet: ${this.spreadsheetId}`,
      );

      // 1. Fetch data from Google Sheets
      const sheetData = await this.googleSheetsService.getSheetData(
        this.spreadsheetId,
        sheetNameToSync,
      );

      if (!sheetData || !sheetData.rows || sheetData.rows.length === 0) {
        this.logger.warn(
          `No data found in sheet: '${sheetNameToSync}' or sheet is empty.`,
        );
        return {
          message: `No data found or sheet '${sheetNameToSync}' is empty. Nothing to sync.`,
          sheet: sheetNameToSync,
          rowsProcessed: 0,
        };
      }

      this.logger.log(
        `Fetched ${sheetData.rows.length} rows from sheet: '${sheetNameToSync}'.`,
      );

      const scheduleItems: TimetableItemDto[] = sheetData.rows
        .map((row) => {
          const item = new TimetableItemDto();
          item.course = row['Курс'];
          item.group = row['Группа'];
          item.date = row['Дата'];
          item.time = row['Время'];
          item.subject = row['Дисциплина'];
          item.lessonType = row['Вид занятий'];
          item.teacherName = row['ФИО преподавателя'];
          item.lessonFormat = row['Формат проведения занятия'];
          item.location = row['Аудитория/ссылка'];
          return item;
        })
        .filter((item) => item.teacherName);

      // 2. Save data to MongoDB via TimetableService
      const result =
        await this.scheduleService.overwriteSchedules(scheduleItems);

      this.logger.log(
        `Sync completed for sheet: '${sheetNameToSync}'. New: ${result.newCount}, Deleted: ${result.deletedCount}, Groups: ${result.groupsAffected.join(', ')}`,
      );

      return {
        message: `Successfully synced sheet '${sheetNameToSync}' to database.`,
        sheet: sheetNameToSync,
        sourceRowsFetched: sheetData.rows.length,
        dbOperations: result,
      };
    }
  }
}
