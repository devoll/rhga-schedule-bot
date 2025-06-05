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
        throw new Error(
          `Ошибка при загрузке данных: ${response.status} ${response.statusText}`,
        );
      }

      const text = await response.text();
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

      // Извлекаем заголовки (эта логика остается прежней, она корректно формирует список ожидаемых заголовков)
      const headers = cols
        .filter((col: any) => col && col.label && col.label.trim() !== '')
        .map((col: any) => col.label.trim());

      // Извлекаем строки
      const rows = rawRows.map((row: any) => {
        const rowData: Record<string, any> = {};
        if (row && row.c) {
          // Убедимся, что есть массив ячеек 'c'
          row.c.forEach((cell: any, cellIndex: number) => {
            const colDef = cols[cellIndex]; // Получаем определение столбца для текущей ячейки
            // Используем заголовок из определения столбца, если он валидный
            if (colDef && colDef.label && colDef.label.trim() !== '') {
              const headerName = colDef.label.trim();
              // Предпочитаем отформатированное значение (cell.f), затем сырое значение (cell.v)
              // Если cell равен null (пустая ячейка), присваиваем пустую строку
              rowData[headerName] = cell ? cell.f || cell.v : '';
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
    } catch (error) {
      // Добавляем больше контекста в сообщение об ошибке
      throw new Error(
        `Не удалось загрузить или обработать данные из листа '${sheetName}': ${error.message}`,
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
        console.error(`Ошибка при загрузке листа ${sheetName}:`, error.message); // Оставляем логирование, но не прерываем весь процесс
      }
    }

    return results;
  }
}
