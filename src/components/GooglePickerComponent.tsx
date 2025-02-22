import React, { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, FilePlus } from 'lucide-react';
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
  };
  serviceType: string;
  title?: string;
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
  title = 'Select a file'
}: GooglePickerProps) => {
  // Initialize the Google API client
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

      const view = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setParent('root');

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
              url: file.url
            });
          }
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        {selectedFile ? (
          <>
            <div className="flex items-center gap-2 p-2 border rounded-md flex-1">
              <FileText className="h-4 w-4" />
              <span className="text-sm truncate">{selectedFile.name}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={openPicker}
            >
              Change
            </Button>
          </>
        ) : (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={openPicker}
          >
            <FilePlus className="h-4 w-4 mr-2" />
            Select File
          </Button>
        )}
      </div>
    </div>
  );
};

export default GooglePicker;