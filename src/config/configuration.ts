export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    defaultSheet: process.env.GOOGLE_DEFAULT_SHEET_NAME || 'Лист1',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    domain: process.env.TELEGRAM_DOMAIN, // Добавлено для вебхука
    webhookPath: process.env.TELEGRAM_WEBHOOK_PATH, // Добавлено для вебхука
  },
  sqlite: {
    path: process.env.SQLITE_PATH || ':memory:',
  },
});
