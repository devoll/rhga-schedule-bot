import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SheetData {
  title: string;
  headers: string[];
  rows: Record<string, any>[];
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly baseUrl = 'https://docs.google.com/spreadsheets/d';

  constructor(private readonly httpService: HttpService) {}

  private getColumnIndex(columnId: string): number {
    let index = 0;
    for (let i = 0; i < columnId.length; i++) {
      index = index * 26 + (columnId.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1; // 0-indexed
  }

  /**
   * Получает данные из указанного листа публичной Google таблицы
   * @param spreadsheetId ID Google таблицы
   * @param sheetName Название листа или gid
   * @returns Данные листа в формате JSON
   */
  async getSheetData(
    spreadsheetId: string,
    sheetName: string,
  ): Promise<SheetData> {
    const url = `${
      this.baseUrl
    }/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}`;
    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: 'text', timeout: 30_000 }),
    );
    const text = response.data;
    // Удаляем префикс и суффикс, которые добавляет Google, или если это чистый JSON, оставляем как есть.
    // Эта регулярка находит первый '{' и последний '}' и берет все между ними, включая их.
    // Это должно работать как для `google.visualization.Query.setResponse({json})` так и для чистого `{json}`.
    const jsonStr = text.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1');

    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(
        `Ошибка разбора JSON от Google Sheets: ${e.message}. Извлеченная строка (начало): ${jsonStr.substring(0, 200)}...`,
      );
    }

    // Проверка на ошибки, возвращаемые самим API Google Sheets в JSON
    if (parsedData.status === 'error') {
      const errorMessages = (parsedData.errors || [])
        .map(
          (err: any) =>
            err.detailed_message ||
            err.message ||
            'Неизвестная ошибка API Google',
        )
        .join(', ');
      throw new Error(
        `Google Sheets API вернуло ошибку: ${errorMessages || 'Нет деталей об ошибке'}`,
      );
    }

    if (!parsedData.table) {
      // Если нет 'table', возможно, лист пуст или ответ некорректен
      return {
        title: sheetName,
        headers: [],
        rows: [],
      };
    }

    const table = parsedData.table;
    const cols = table.cols || [];
    const rawRows = table.rows || [];

    // Извлекаем заголовки
    const headers = cols
      .filter(
        (colDef: any) =>
          colDef && colDef.label && colDef.label.trim() !== '' && colDef.id,
      )
      .map((colDef: any) => colDef.label.trim());

    // Извлекаем строки
    const rows = rawRows.map((row: any) => {
      const rowData: Record<string, any> = {};
      if (row && row.c) {
        // Убедимся, что есть массив ячеек 'c'
        cols.forEach((colDef: any) => {
          if (
            colDef &&
            colDef.label &&
            colDef.label.trim() !== '' &&
            colDef.id
          ) {
            const headerName = colDef.label.trim();
            const sheetColumnIndex = this.getColumnIndex(colDef.id);

            if (sheetColumnIndex >= 0 && sheetColumnIndex < row.c.length) {
              const cell = row.c[sheetColumnIndex];
              let valueToStore: any = cell
                ? cell.f !== undefined && cell.f !== null
                  ? cell.f
                  : cell.v
                : '';

              // Парсинг даты, если заголовок 'Дата'
              if (
                headerName === 'Дата' &&
                typeof valueToStore === 'string' &&
                valueToStore.trim() !== ''
              ) {
                const dateString = valueToStore.trim();
                // Ожидаемый формат: DD.MM.YY или DD.MM.YY.ДеньНедели
                const parts = dateString.split('.');

                if (parts.length >= 3) {
                  const day = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10); // Месяц из таблицы (1-12)
                  const yearShort = parseInt(parts[2], 10);

                  if (
                    !isNaN(day) &&
                    !isNaN(month) &&
                    !isNaN(yearShort) &&
                    yearShort >= 0 &&
                    yearShort <= 99
                  ) {
                    const year = 2000 + yearShort; // Предполагаем 21 век
                    // Проверка на корректность дня и месяца
                    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                      try {
                        // Создаем дату в UTC, чтобы избежать проблем с часовыми поясами при парсинге
                        const parsedDate = new Date(
                          Date.UTC(year, month - 1, day),
                        ); // month в JS 0-индексированный

                        // Дополнительная валидация, что дата не "перескочила" (например, 30 февраля)
                        if (
                          parsedDate.getUTCFullYear() === year &&
                          parsedDate.getUTCMonth() === month - 1 &&
                          parsedDate.getUTCDate() === day
                        ) {
                          valueToStore = parsedDate.toISOString(); // Преобразуем в ISO строку (напр. '2024-11-07T00:00:00.000Z')
                        } else {
                          // Дата была некорректной (например, 30.02.24), оставляем исходную строку
                          this.logger.warn(
                            `Invalid date components for string "${dateString}" (header "${headerName}"). Keeping original.`,
                          );
                        }
                      } catch (e) {
                        this.logger.error(
                          `Failed to parse date string "${dateString}" for header "${headerName}": ${e.message}. Keeping original.`,
                        );
                        // Ошибка при создании Date, оставляем исходную строку
                      }
                    }
                    // else: день/месяц вне допустимого диапазона, оставляем исходную строку
                  }
                  // else: год некорректен, оставляем исходную строку
                }
                // else: недостаточно частей для даты, оставляем исходную строку
              }
              rowData[headerName] = valueToStore;
            } else {
              rowData[headerName] = ''; // Если индекс вне диапазона, ставим пустое значение
            }
          }
        });
      }
      return rowData;
    });

    return {
      title: sheetName, // Используем имя листа, переданное в функцию, как и раньше
      headers,
      rows,
    };
  }

  /**
   * Получает данные всех листов публичной Google таблицы
   * @param spreadsheetId ID Google таблицы
   * @param sheetNames Массив названий листов или gid
   * @returns Массив данных всех листов
   */
  async getAllSheetsData(
    spreadsheetId: string,
    sheetNames: string[],
  ): Promise<SheetData[]> {
    const results: SheetData[] = [];

    for (const sheetName of sheetNames) {
      try {
        const sheetData = await this.getSheetData(spreadsheetId, sheetName);
        results.push(sheetData);
      } catch (error) {
        this.logger.error(
          `Ошибка при загрузке листа ${sheetName}:`,
          error.message,
        ); // Оставляем логирование, но не прерываем весь процесс
      }
    }

    return results;
  }
}
