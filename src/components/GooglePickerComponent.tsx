import React, { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, FilePlus, ExternalLink, Folder } from 'lucide-react';
import { TokenManager } from '@/lib/auth/TokenManager';

interface GooglePickerProps {
  onFileSelect: (fileDetails: { 
    id: string; 
    name: string; 
    mimeType: string;
    url?: string;
    [key: string]: any; 
  }) => void;
  selectedFile?: {
    id: string;
    name: string;
    mimeType: string;
    url?: string;
  };
  serviceType: string;
  title?: string;
  pickerOptions?: {
    viewTypes?: string[];
    selectFolders?: boolean;
    mimeTypes?: string[];
  };
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const GooglePicker = ({ 
  onFileSelect, 
  selectedFile,
  serviceType,
  title = 'Select a file',
  pickerOptions = {}
}: GooglePickerProps) => {
  const initializeGoogleApi = useCallback(async () => {
    if (!window.gapi) {
      console.error('Google API client not loaded');
      return;
    }

    if (!window.google) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    }

    await new Promise<void>((resolve) => {
      window.gapi.load('picker', { callback: resolve });
    });
  }, []);

  useEffect(() => {
    initializeGoogleApi();
  }, [initializeGoogleApi]);

  const openPicker = async () => {
    try {
      const accessToken = await TokenManager.getValidToken(serviceType);

      if (!accessToken) {
        console.error('No access token available');
        return;
      }

      let view;
      if (pickerOptions.selectFolders) {
        // Folder selection view
        view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true)
          .setMimeTypes('application/vnd.google-apps.folder')
          .setIncludeFolders(true);
      } else if (pickerOptions.mimeTypes && pickerOptions.mimeTypes.length > 0) {
        // Specific file type view (e.g., only spreadsheets)
        view = new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false)
          .setMimeTypes(pickerOptions.mimeTypes.join(','));
      } else {
        // Default file selection view for Drive
        view = new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false);
      }

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
        .setTitle(title)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const file = data.docs[0];
            onFileSelect({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              url: file.url,
              iconUrl: file.iconUrl,
              description: file.description,
              lastEditedUtc: file.lastEditedUtc,
              serviceId: serviceType
            });
          }
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
    }
  };

  const openInNewTab = () => {
    if (selectedFile?.id) {
      const baseUrl = selectedFile.mimeType === 'application/vnd.google-apps.folder'
        ? 'https://drive.google.com/drive/folders/'
        : selectedFile.mimeType === 'application/vnd.google-apps.spreadsheet'
        ? 'https://docs.google.com/spreadsheets/d/'
        : 'https://drive.google.com/file/d/';
      
      window.open(`${baseUrl}${selectedFile.id}${selectedFile.mimeType === 'application/vnd.google-apps.folder' ? '' : '/view'}`, '_blank');
    }
  };

  const isFolder = selectedFile?.mimeType === 'application/vnd.google-apps.folder';

  return (
    <div className="space-y-2">
      {selectedFile ? (
        <div className="flex gap-2">
          <div 
            className="flex items-center gap-2 p-2 border rounded-md flex-1 hover:bg-gray-50 cursor-pointer"
            onClick={openPicker}
          >
            {isFolder ? (
              <Folder className="h-4 w-4 flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="text-sm truncate">{selectedFile.name}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={openInNewTab}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={openPicker}
        >
          {pickerOptions.selectFolders ? (
            <Folder className="h-4 w-4 mr-2" />
          ) : (
            <FilePlus className="h-4 w-4 mr-2" />
          )}
          {pickerOptions.selectFolders ? 'Select Folder' : 'Select File'}
        </Button>
      )}
    </div>
  );
};

export default GooglePicker;