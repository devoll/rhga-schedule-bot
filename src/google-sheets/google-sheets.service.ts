import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

export interface SheetData {
  title: string;
  headers: string[];
  rows: Record<string, any>[];
}

@Injectable()
export class GoogleSheetsService {
  private readonly baseUrl = 'https://docs.google.com/spreadsheets/d';

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
    try {
      const url = `${
        this.baseUrl
      }/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName,
      )}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Ошибка при загрузке данных: ${response.statusText}`);
      }

      const text = await response.text();
      // Удаляем префикс и суффикс, которые добавляет Google
      const jsonStr = text.replace(/^.*?({.*}).*$/, '$1');
      const data = JSON.parse(jsonStr);

      // Извлекаем заголовки
      const headers = data.table.cols
        .filter((col) => col.label)
        .map((col) => col.label);

      // Извлекаем строки
      const rows = data.table.rows.map((row) => {
        const rowData: Record<string, any> = {};
        row.c.forEach((cell: any, index: number) => {
          if (headers[index]) {
            rowData[headers[index]] = cell ? cell.v : '';
          }
        });
        return rowData;
      });

      return {
        title: sheetName,
        headers,
        rows,
      };
    } catch (error) {
      throw new Error(
        `Не удалось загрузить данные из листа ${sheetName}: ${error.message}`,
      );
    }
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
        console.error(`Ошибка при загрузке листа ${sheetName}:`, error);
      }
    }

    return results;
  }
}
