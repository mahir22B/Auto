// src/lib/types/PortTypes.ts
export type BaseType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'any';

export interface TypeDefinition {
  baseType: BaseType;
  isArray?: boolean;
  isNullable?: boolean;
  isAdaptive?: boolean; // Indicates that the type can change based on runtime values
  arrayItemType?: BaseType; // For array types, what kind of items does it contain
  objectShape?: Record<string, TypeDefinition>; // For object types, what is the structure
  description?: string;
}

export interface TypeRegistry {
  [typeName: string]: TypeDefinition;
}

// Define our type registry
export const TYPE_REGISTRY: TypeRegistry = {
  'string': { 
    baseType: 'string',
    description: 'A text value'
  },
  'number': { 
    baseType: 'number',
    description: 'A numeric value'
  },
  'boolean': { 
    baseType: 'boolean',
    description: 'True or false'
  },
  'string_array': { 
    baseType: 'array',
    isArray: true,
    arrayItemType: 'string',
    description: 'A list of text values'
  },
  'number_array': { 
    baseType: 'array',
    isArray: true,
    arrayItemType: 'number',
    description: 'A list of numeric values'
  },
  'adaptive_string': { 
    baseType: 'string',
    isAdaptive: true,
    description: 'A text value or list of text values depending on context'
  },
  'score': { 
    baseType: 'number',
    description: 'A numerical score between 0 and 100'
  },
  'email': {
    baseType: 'object',
    objectShape: {
      subject: { baseType: 'string' },
      body: { baseType: 'string' },
      sender: { baseType: 'string' },
      recipients: { baseType: 'array', arrayItemType: 'string' }
    },
    description: 'A complete email object'
  }
};

// Logic to check if types are compatible
export function areTypesCompatible(sourceTypeName: string, targetTypeName: string): boolean {
  const sourceType = TYPE_REGISTRY[sourceTypeName];
  const targetType = TYPE_REGISTRY[targetTypeName];
  
  if (!sourceType || !targetType) {
    return false; // Unknown types are not compatible
  }
  
  // Any type is compatible with any other type
  if (sourceType.baseType === 'any' || targetType.baseType === 'any') {
    return true;
  }
  
  // Adaptive types are compatible with both single values and arrays
  if (sourceType.isAdaptive) {
    // If source is adaptive and target is array of the same base type or single value of same base type
    if (targetType.isArray && targetType.arrayItemType === sourceType.baseType) {
      return true;
    }
    return targetType.baseType === sourceType.baseType;
  }
  
  // String arrays can flow into string (will use first item)
  if (sourceType.isArray && sourceType.arrayItemType === 'string' && 
      targetType.baseType === 'string' && !targetType.isArray) {
    return true;
  }
  
  // String can flow into string arrays (will be wrapped)
  if (sourceType.baseType === 'string' && !sourceType.isArray &&
      targetType.isArray && targetType.arrayItemType === 'string') {
    return true;
  }
  
  // Score is compatible with number type
  if ((sourceType.baseType === 'number' && targetTypeName === 'score') || 
      (sourceTypeName === 'score' && targetType.baseType === 'number')) {
    return true;
  }
  
  // Same type is always compatible
  if (sourceType.baseType === targetType.baseType && 
      sourceType.isArray === targetType.isArray) {
    return true;
  }
  
  // By default, not compatible
  return false;
}

// Function to determine what transformation is needed between types
export function getTypeTransformation(sourceTypeName: string, targetTypeName: string): string | null {
  if (!areTypesCompatible(sourceTypeName, targetTypeName)) {
    return null; // Types are not compatible
  }

  const sourceType = TYPE_REGISTRY[sourceTypeName];
  const targetType = TYPE_REGISTRY[targetTypeName];
  
  // If types are identical, no transformation needed
  if (sourceType.baseType === targetType.baseType && sourceType.isArray === targetType.isArray) {
    return 'DIRECT';
  }
  
  // If source is a string array and target is string, take first item
  if (sourceType.isArray && sourceType.arrayItemType === 'string' && 
      targetType.baseType === 'string' && !targetType.isArray) {
    return 'ARRAY_TO_SINGLE';
  }
  
  // If source is a string and target is string array, wrap in array
  if (sourceType.baseType === 'string' && !sourceType.isArray &&
      targetType.isArray && targetType.arrayItemType === 'string') {
    return 'SINGLE_TO_ARRAY';
  }
  
  // Score to number and vice versa
  if ((sourceTypeName === 'score' && targetType.baseType === 'number') ||
      (sourceType.baseType === 'number' && targetTypeName === 'score')) {
    return 'DIRECT'; // No transformation needed, they're compatible as-is
  }
  
  // If source is adaptive, it can flow directly but may need runtime checking
  if (sourceType.isAdaptive) {
    return 'ADAPTIVE';
  }
  
  return 'UNKNOWN'; // Should never reach here if areTypesCompatible is true
}

// Utility to apply a transformation
export function transformValue(value: any, transformation: string): any {
  switch (transformation) {
    case 'DIRECT':
      return value;
    case 'ARRAY_TO_SINGLE':
      return Array.isArray(value) && value.length > 0 ? value[0] : null;
    case 'SINGLE_TO_ARRAY':
      return Array.isArray(value) ? value : [value];
    case 'ADAPTIVE':
      // No transformation needed, the executor should have already adapted the type
      return value;
    default:
      return value;
  }
}