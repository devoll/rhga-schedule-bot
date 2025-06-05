export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    defaultSheet: process.env.GOOGLE_DEFAULT_SHEET_NAME || 'Лист1',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
});
