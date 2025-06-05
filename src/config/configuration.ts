export default () => ({
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    defaultSheet: process.env.GOOGLE_DEFAULT_SHEET || 'Лист1',
  },
});
