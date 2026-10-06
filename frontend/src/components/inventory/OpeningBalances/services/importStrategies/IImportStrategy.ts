/* eslint-disable @typescript-eslint/no-explicit-any */
// services/importStrategies/IImportStrategy.ts
import { ImportPreviewItem } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface IImportStrategy {
  validate(data: any[]): ValidationResult;
  transform(data: any[]): Omit<ImportPreviewItem, 'status' | 'error'>[];
  getEndpoint(): string;
  getFileAcceptance(): string;
}