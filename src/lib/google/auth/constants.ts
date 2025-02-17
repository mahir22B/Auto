export const GOOGLE_AUTH_ENDPOINTS = {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
  } as const;
  
  export const GOOGLE_SCOPES = {
    gmail: [
      'https://www.googleapis.com/auth/gmail.readonly',  // For reading unread emails
      'https://www.googleapis.com/auth/gmail.send',      // For sending emails
      'https://www.googleapis.com/auth/gmail.modify'     // For marking emails as read
    ],
    drive: [
      'https://www.googleapis.com/auth/drive.readonly',  // For reading files and folders
      'https://www.googleapis.com/auth/drive.file',      // For creating/updating files
      'https://www.googleapis.com/auth/drive.metadata'   // For folder structure and metadata
    ],
  } as const;