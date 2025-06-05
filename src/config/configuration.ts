export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    defaultSheet: process.env.GOOGLE_DEFAULT_SHEET_NAME || 'Лист1',
  },
  database: {
    uri: process.env.MONGODB_URI,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
});
