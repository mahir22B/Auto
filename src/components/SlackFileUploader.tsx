import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X } from 'lucide-react';

interface SlackFileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[] | null;
}

const SlackFileUploader: React.FC<SlackFileUploaderProps> = ({
  onFilesSelected,
  selectedFiles
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to array
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  };
  
  const removeFile = (index: number) => {
    if (selectedFiles) {
      const newFiles = [...selectedFiles];
      newFiles.splice(index, 1);
      onFilesSelected(newFiles);
    }
  };
  
  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleFileClick}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          {selectedFiles && selectedFiles.length > 0
            ? `${selectedFiles.length} file(s) selected`
            : 'Select files'}
        </Button>
      </div>
      
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="space-y-1 mt-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm"
            >
              <div className="truncate max-w-[80%]">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SlackFileUploader;