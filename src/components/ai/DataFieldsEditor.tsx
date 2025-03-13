// src/components/ai/DataFieldsEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";

interface DataField {
  name: string;
  type: 'text' | 'number' | 'boolean';
  description?: string;
}

interface DataFieldsEditorProps {
  value: DataField[];
  onChange: (fields: DataField[]) => void;
}

export const DataFieldsEditor: React.FC<DataFieldsEditorProps> = ({ value = [], onChange }) => {
  const [fields, setFields] = useState<DataField[]>(value);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Update local state when prop value changes
  useEffect(() => {
    setFields(value || []);
  }, [value]);

  const handleAddField = () => {
    const newFields = [...fields, { name: '', type: 'text' }];
    setFields(newFields);
    onChange(newFields);
  };

  const handleRemoveField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    onChange(newFields);
  };

  const handleFieldChange = (index: number, field: Partial<DataField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...field };
    setFields(newFields);
    onChange(newFields);
  };

  // Sanitize field name - convert to snake_case and remove special characters
  const sanitizeFieldName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')        // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, '')  // Remove special characters
      .replace(/_{2,}/g, '_');     // Remove duplicate underscores
  };

  // Handle wheel event to prevent zooming when scrolling the container
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      
      if (
        (e.deltaY > 0 && scrollTop < scrollHeight - clientHeight) ||
        (e.deltaY < 0 && scrollTop > 0)
      ) {
        // Prevent default behavior AND stop propagation
        e.preventDefault();
        e.stopPropagation();
        
        // Manually scroll the container
        scrollContainerRef.current.scrollTop += e.deltaY;
      }
    }
  };

  // Calculate max height based on number of fields
  const maxFieldsBeforeScroll = 2;
  const shouldScroll = fields.length > maxFieldsBeforeScroll;
  
  // Enhanced scrollable style with more explicit properties
  const scrollableStyle = shouldScroll ? {
    maxHeight: '320px',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    display: 'block',
    position: 'relative' as const,
    WebkitOverflowScrolling: 'touch', // For smooth scrolling on iOS
  } : {};

  return (
    <div className="space-y-4">
      {/* Scrollable fields container with nodrag class to prevent interfering with ReactFlow */}
      <div 
        ref={scrollContainerRef}
        className={`space-y-4 ${shouldScroll ? 'pr-2 nodrag nopan' : ''}`}
        style={scrollableStyle}
        onWheel={shouldScroll ? handleWheel : undefined}
      >
        {fields.map((field, index) => (
          <div key={index} className="p-4 border rounded-lg bg-gray-50 relative">
            <button
              type="button"
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemoveField(index);
              }}
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor={`field-name-${index}`}>Name:</Label>
                <Input
                  id={`field-name-${index}`}
                  value={field.name || ''}
                  onChange={(e) => {
                    const sanitizedName = sanitizeFieldName(e.target.value);
                    handleFieldChange(index, { name: sanitizedName });
                  }}
                  placeholder="e.g. product_name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor={`field-type-${index}`}>Type:</Label>
                <Select
                  value={field.type}
                  onValueChange={(value: 'text' | 'number' | 'boolean') => 
                    handleFieldChange(index, { type: value })
                  }
                >
                  <SelectTrigger id={`field-type-${index}`} className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor={`field-description-${index}`}>Description:</Label>
                <Input
                  id={`field-description-${index}`}
                  value={field.description || ''}
                  onChange={(e) => handleFieldChange(index, { description: e.target.value })}
                  placeholder="[Optional] The full product name including model number"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={handleAddField}
      >
        <Plus className="h-4 w-4" />
        Add Data Field
      </Button>
    </div>
  );
};