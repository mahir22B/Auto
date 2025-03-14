// src/lib/gdrive/executor.ts

import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { GDriveConfig } from "./types";

interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
}

export class GDriveExecutor extends AbstractExecutor {
  private async makeGDriveRequest(
    endpoint: string,
    options: RequestInit,
    context: ExecutorContext
  ) {
    const response = await this.makeAuthorizedRequest(
      "gdrive",
      `https://www.googleapis.com/drive/v3/${endpoint}`,
      options
    );
    return response.json();
  }

  private async readFile(
    context: ExecutorContext,
    config: GDriveConfig
  ): Promise<ExecutionResult> {
    try {
      if (!config.fileId) {
        throw new Error("File ID is required");
      }

      // Get file metadata
      const fileMetadata = await this.makeGDriveRequest(
        `files/${config.fileId}?fields=id,name,mimeType,size,webViewLink`,
        { method: "GET" },
        context
      );

      // Get file content
      let fileContent;
      // For text files, we can get the content directly
      if (fileMetadata.mimeType.startsWith('text/') || 
          fileMetadata.mimeType === 'application/json') {
        const contentResponse = await this.makeAuthorizedRequest(
          "gdrive",
          `https://www.googleapis.com/drive/v3/files/${config.fileId}?alt=media`,
          { method: "GET" }
        );
        fileContent = await contentResponse.text();
      } else {
        // For binary or other types of files, just provide a placeholder message
        fileContent = `Binary file: ${fileMetadata.mimeType} (${fileMetadata.size} bytes)`;
      }

      return {
        success: true,
        data: {
          output_fileName: fileMetadata.name,
          output_fileContents: fileContent,
          metadata: fileMetadata,
          displayText: `Read file: ${fileMetadata.name}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read file",
          details: error
        }
      };
    }
  }

  private async readFolder(
    context: ExecutorContext,
    config: GDriveConfig
  ): Promise<ExecutionResult> {
    try {
      if (!config.folderId) {
        throw new Error("Folder ID is required");
      }

      // Get folder metadata
      const folderMetadata = await this.makeGDriveRequest(
        `files/${config.folderId}?fields=id,name,mimeType`,
        { method: "GET" },
        context
      );

      if (folderMetadata.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error("The provided ID is not a folder");
      }

      // List files in folder
      const fileListResponse = await this.makeGDriveRequest(
        `files?q='${config.folderId}' in parents&fields=files(id,name,mimeType,iconLink,size,modifiedTime,webViewLink)`,
        { method: "GET" },
        context
      );

      const files: FileMetadata[] = fileListResponse.files || [];

      return {
        success: true,
        data: {
          output_files: files,
          output_folderName: folderMetadata.name,
          output_fileCount: files.length,
          folderName: folderMetadata.name,
          fileCount: files.length,
          displayText: `Read folder: ${folderMetadata.name} (${files.length} files)`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read folder",
          details: error
        }
      };
    }
  }

  private async writeFile(
    context: ExecutorContext,
    config: GDriveConfig
  ): Promise<ExecutionResult> {
    try {
      // Check for inputs from connected nodes first, then fall back to config values
      const fileName = this.getInputValueOrConfig(context, 'input_fileName', config, 'fileName');
      const content = this.getInputValueOrConfig(context, 'input_content', config, 'content');
      
      if (!config.folderId) {
        throw new Error("Folder ID is required");
      }
      
      if (!fileName) {
        throw new Error("File name is required");
      }
      
      if (!content) {
        throw new Error("File content is required");
      }
    
      // Create the file metadata
      const metadata = {
        name: fileName,
        parents: [config.folderId]
      };
    
      // Prepare the multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelimiter = "\r\n--" + boundary + "--";
    
      // Create the multipart request body
      const body = delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/plain\r\n\r\n' +
        content +
        closeDelimiter;
      
      // Upload the file
      const uploadResponse = await this.makeAuthorizedRequest(
        "gdrive",
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
        {
          method: "POST",
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: body
        }
      );
    
      const uploadData = await uploadResponse.json();
      console.log("Google Drive API upload response:", uploadData);
    
      // Get the file ID from the response
      const fileId = uploadData.id;
      
      if (!fileId) {
        throw new Error("File was created but no file ID was returned");
      }
      
      // After creating the file, we need to explicitly get the webViewLink
      // Using files.get method with the webViewLink field specified
      const fileMetadataResponse = await this.makeAuthorizedRequest(
        "gdrive",
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink`,
        { method: "GET" }
      );
      
      const fileMetadata = await fileMetadataResponse.json();
      console.log("File metadata response:", fileMetadata);
      
      // Get the webViewLink from the response
      const webViewLink = fileMetadata.webViewLink;
      
      // If for some reason the webViewLink is still not available, create a fallback link
      const fileUrl = webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
      
      return {
        success: true,
        data: {
          output_fileUrl: fileUrl,
          output_fileId: fileId,
          output_fileName: uploadData.name || fileName,
          fileId: fileId,
          fileName: uploadData.name || fileName,
          displayText: `File created: ${fileName}`,
          message: `File "${fileName}" created successfully`,
          webViewLink: webViewLink
        }
      };
    } catch (error) {
      console.error("Error writing file to Google Drive:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to write file",
          details: error
        },
        data: {
          output_fileUrl: undefined,
          output_fileId: undefined,
          output_fileName: undefined,
          fileId: undefined,
          fileName: undefined,
          displayText: "Failed to create file",
          message: error instanceof Error ? error.message : "Failed to write file"
        }
      };
    }
  }

  async execute(
    context: ExecutorContext,
    config: GDriveConfig
  ): Promise<ExecutionResult> {
    console.log("Executing Google Drive action:", config.action);
    try {
      switch (config.action) {
        case "READ_FILE":
          return this.readFile(context, config);
        case "READ_FOLDER":
          return this.readFolder(context, config);
        case "WRITE_FILE":
          return this.writeFile(context, config);
        default:
          return {
            success: false,
            error: {
              message: `Unsupported Google Drive action: ${config.action}`,
            },
          };
      }
    } catch (error) {
      console.error("Google Drive executor error:", error);
      return {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "An error occurred during execution",
          details: error,
        },
      };
    }
  }
}