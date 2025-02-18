export const SHEETS_ACTIONS = {
    READ_SHEET: {
      id: 'READ_SHEET',
      name: 'Google Sheets Reader',
      description: 'Get data from Google Sheets',
      configFields: [
        {
          name: 'spreadsheetId',
          label: 'Spreadsheet ID',
          type: 'string',
          required: true,
        },
        {
          name: 'range',
          label: 'Range (e.g., Sheet1!A1:D10)',
          type: 'string',
          required: true,
        }
      ]
    },
    WRITE_SHEET: {
      id: 'WRITE_SHEET',
      name: 'Google Sheets Writer',
      description: 'Add data to Google Sheets',
      configFields: [
        {
          name: 'spreadsheetId',
          label: 'Spreadsheet ID',
          type: 'string',
          required: true,
        },
        {
          name: 'range',
          label: 'Range (e.g., Sheet1!A:D)',
          type: 'string',
          required: true,
        },
        {
          name: 'values',
          label: 'Values (JSON array)',
          type: 'text',
          required: true,
        }
      ]
    },
    UPDATE_SHEET: {
      id: 'UPDATE_SHEET',
      name: 'Google Sheets Updater',
      description: 'Edit Google Sheets row',
      configFields: [
        {
          name: 'spreadsheetId',
          label: 'Spreadsheet ID',
          type: 'string',
          required: true,
        },
        {
          name: 'range',
          label: 'Range to Update',
          type: 'string',
          required: true,
        },
        {
          name: 'values',
          label: 'Values (JSON array)',
          type: 'text',
          required: true,
        }
      ]
    }
  };