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
    this.spreadsheetId = this.configService.get<string>(
      'googleSheets.spreadsheetId',
    );
    this.defaultSheetName = this.configService.get<string>(
      'googleSheets.defaultSheet',
    );

    if (!this.spreadsheetId) {
      const errorMessage = 'GOOGLE_SPREADSHEET_ID is not configured!';
      this.logger.error(errorMessage);
    }
  }

  @Cron('0 0 */1 * * *')
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

      try {
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
      } catch (error) {
        this.logger.error(
          `Error during sync for sheet '${sheetNameToSync}': ${error.message}`,
          error.stack,
        );
        throw new HttpException(
          `Failed to sync sheet '${sheetNameToSync}': ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
