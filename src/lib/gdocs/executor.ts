import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { GDocsConfig } from "./types";

export class GDocsExecutor extends AbstractExecutor {
  private async makeGDocsRequest(
    endpoint: string,
    options: RequestInit,
    context: ExecutorContext
  ) {
    const response = await this.makeAuthorizedRequest(
      "gdocs", // This is the service ID
      `https://docs.googleapis.com/v1/${endpoint}`,
      options
    );
    return response.json();
  }

  private async readDocument(
    context: ExecutorContext,
    config: GDocsConfig
  ): Promise<ExecutionResult> {
    try {
      // Check for input URL first, then fall back to config
      let docUrl = this.getInputValueOrConfig(context, 'input_documentUrl', config, 'documentUrl');
      
      if (!docUrl) {
        throw new Error("Document URL is required");
      }

      // Extract document ID from URL
      let documentId = '';
      
      // Try to extract the document ID from the URL
      const match = docUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        documentId = match[1];
      } else {
        // If it's not a URL but might be a direct ID
        if (!docUrl.includes('/') && !docUrl.includes('http')) {
          documentId = docUrl;
        } else {
          throw new Error("Invalid Google Doc URL format. Please use a URL like https://docs.google.com/document/d/DOCUMENT_ID/edit");
        }
      }

      console.log("Extracted document ID:", documentId);

      // Get the document content
      const document = await this.makeGDocsRequest(
        `documents/${documentId}`,
        { method: "GET" },
        context
      );
      
      if (!document || !document.body) {
        throw new Error("Failed to fetch document or document is empty");
      }

      // Extract document content
      // Google Docs API returns content in a structured format
      // We need to extract the text from the document content
      let plainText = "";
      
      if (document.body && document.body.content) {
        const extractText = (elements: any[]) => {
          elements.forEach(element => {
            if (element.paragraph) {
              element.paragraph.elements.forEach((paragraphElement: any) => {
                if (paragraphElement.textRun && paragraphElement.textRun.content) {
                  plainText += paragraphElement.textRun.content;
                }
              });
            } else if (element.table) {
              element.table.tableRows.forEach((row: any) => {
                row.tableCells.forEach((cell: any) => {
                  if (cell.content) {
                    extractText(cell.content);
                  }
                });
              });
            } else if (element.tableOfContents) {
              if (element.tableOfContents.content) {
                extractText(element.tableOfContents.content);
              }
            } else if (element.sectionBreak) {
              plainText += "\n\n";
            }
          });
        };
        
        extractText(document.body.content);
      }

      // Generate document URL for reference
      const fullDocUrl = `https://docs.google.com/document/d/${documentId}/edit`;

      return {
        success: true,
        data: {
          output_title: document.title || "Untitled Document",
          output_content: plainText,
          title: document.title || "Untitled Document",
          content: plainText,
          url: fullDocUrl,
          displayText: `Read document: ${document.title || "Untitled Document"}`,
          _output_types: {
            output_title: 'string',
            output_content: 'string'
          }
        }
      };
    } catch (error) {
      console.error("Error reading Google Doc:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read document",
          details: error
        }
      };
    }
  }

  private async writeDocument(
    context: ExecutorContext,
    config: GDocsConfig
  ): Promise<ExecutionResult> {
    try {
      // Get title and content from inputs first, then fallback to config
      const title = this.getInputValueOrConfig(context, 'input_title', config, 'title');
      const content = this.getInputValueOrConfig(context, 'input_content', config, 'content');
      
      if (!title) {
        throw new Error("Document title is required");
      }
      
      if (!content) {
        throw new Error("Document content is required");
      }
  
      // Prepare the request body for creating a new document
      const requestBody = {
        title: title
      };
      
      // Create the document
      const document = await this.makeGDocsRequest(
        'documents',
        {
          method: "POST",
          body: JSON.stringify(requestBody)
        },
        context
      );
      
      if (!document || !document.documentId) {
        throw new Error("Failed to create document");
      }
      
      // Now that we have the document ID, we need to insert the content
      // The Google Docs API requires a specific format for inserting content
      const insertRequest = {
        requests: [
          {
            insertText: {
              location: {
                index: 1 // Insert at the beginning of the document
              },
              text: content
            }
          }
        ]
      };
      
      // Update the document content
      await this.makeGDocsRequest(
        `documents/${document.documentId}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify(insertRequest)
        },
        context
      );
      
      // Generate document URL
      const docUrl = `https://docs.google.com/document/d/${document.documentId}/edit`;
      
      return {
        success: true,
        data: {
          output_docUrl: docUrl,
          documentId: document.documentId,
          documentUrl: docUrl,
          title: title,
          displayText: `Created document: ${title}`,
          // Include these fields to match the GDrive implementation
          output_fileUrl: docUrl,
          fileUrl: docUrl,
          _output_types: {
            output_docUrl: 'string'
          }
        }
      };
    } catch (error) {
      console.error("Error creating Google Doc:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to create document",
          details: error
        }
      };
    }
  }

  async execute(
    context: ExecutorContext,
    config: GDocsConfig
  ): Promise<ExecutionResult> {
    try {
      switch (config.action) {
        case "READ_DOCUMENT":
          return this.readDocument(context, config);
        case "WRITE_DOCUMENT":
          return this.writeDocument(context, config);
        default:
          return {
            success: false,
            error: {
              message: `Unsupported Google Docs action: ${config.action}`
            }
          };
      }
    } catch (error) {
      console.error("Google Docs executor error:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "An error occurred during execution",
          details: error
        }
      };
    }
  }
}