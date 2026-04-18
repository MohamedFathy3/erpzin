/* eslint-disable @typescript-eslint/no-explicit-any */
// services/importStrategies/ExcelImportStrategy.ts
import { IImportStrategy, ValidationResult, ValidationError } from './IImportStrategy';
import { ImportPreviewItem } from '../../types';

export class ExcelImportStrategy implements IImportStrategy {
  private readonly requiredFields = ['name', 'sku', 'cost'];
  private readonly fieldMappings = {
    name: ['name', 'product_name', 'اسم المنتج', 'Product Name'],
    sku: ['sku', 'SKU'],
    stock: ['quantity', 'stock', 'quantity_available', 'الكمية'],
    cost: ['cost', 'cost_price', 'سعر التكلفة', 'Cost Price', 'Cost'],
    barcode: ['barcode', 'Barcode', 'الباركود'],
    price: ['price', 'Price', 'سعر البيع', 'Sell Price']
  };

  validate(data: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    
    data.forEach((row, index) => {
      const rowNumber = index + 2;
      
      // Check name
      const name = this.getFieldValue(row, 'name');
      if (!name) {
        errors.push({
          row: rowNumber,
          field: 'name',
          message: 'Product name is required'
        });
      }
      
      // Check sku
      const sku = this.getFieldValue(row, 'sku');
      if (!sku) {
        errors.push({
          row: rowNumber,
          field: 'sku',
          message: 'SKU is required'
        });
      }
      
      // Check cost
      const cost = this.getFieldValue(row, 'cost');
      const costNum = Number(cost);
      if (!cost || isNaN(costNum) || costNum < 0) {
        errors.push({
          row: rowNumber,
          field: 'cost',
          message: `Cost must be a valid number (got: ${cost || 'empty'})`
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  transform(data: any[]): Omit<ImportPreviewItem, 'status' | 'error'>[] {
    return data.map((row, index) => {
      const cost = this.getFieldValue(row, 'cost');
      const costNum = Number(cost);
      const price = this.getFieldValue(row, 'price');
      const priceNum = Number(price);
      
      return {
        row: index + 2,
        product_name: this.getFieldValue(row, 'name') || '',
        sku: this.getFieldValue(row, 'sku') || this.generateSku(index),
        quantity: 1, // Default quantity for opening balance
        cost_price: isNaN(costNum) ? 0 : costNum,
        barcode: this.getFieldValue(row, 'barcode') || '',
        price: isNaN(priceNum) ? costNum * 1.3 : priceNum
      };
    });
  }

  getEndpoint(): string {
    return '/products/import';
  }

  getFileAcceptance(): string {
    return '.xlsx,.xls';
  }

  private getFieldValue(row: any, field: keyof typeof this.fieldMappings): string {
    const mappings = this.fieldMappings[field];
    for (const mapping of mappings) {
      if (row[mapping] !== undefined && row[mapping] !== null && row[mapping] !== '') {
        return String(row[mapping]);
      }
    }
    return '';
  }

  private generateSku(index: number): string {
    return `TEMP-${Date.now()}-${index}`;
  }
}