// services/productManager.service.ts
import { InvoiceItem, Product, ProductUnit, ProductColor } from '@/types/purchaseform';

class ProductManager {
  private static instance: ProductManager;
  
  private constructor() {}
  
  static getInstance(): ProductManager {
    if (!ProductManager.instance) {
      ProductManager.instance = new ProductManager();
    }
    return ProductManager.instance;
  }
  
  // ✅ جعل هذه الدالة عامة (public)
  calculateItemTotals(item: InvoiceItem): InvoiceItem {
    const subtotal = item.quantity * item.unit_cost;
    const discountAmount = (subtotal * item.discount_percent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * item.tax_percent) / 100;
    const totalCost = afterDiscount + taxAmount;
    
    return {
      ...item,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_cost: totalCost
    };
  }
  
  // ✅ جعل هذه الدالة عامة (public)
  recalculateItem(items: InvoiceItem[], index: number): InvoiceItem[] {
    const newItems = [...items];
    newItems[index] = this.calculateItemTotals(newItems[index]);
    return newItems;
  }
  
  createItemFromProduct(
    product: Product,
    language: string,
    unitId?: number,
    colorId?: number
  ): InvoiceItem {
    const selectedUnit = unitId 
      ? product.units?.find(u => u.id === unitId)
      : product.units?.[0];
    
    const selectedColor = colorId && selectedUnit?.colors
      ? selectedUnit.colors.find(c => c.id === colorId)
      : null;
    
    const unitCost = selectedUnit 
      ? Number(selectedUnit.cost_price) 
      : Number(product.cost) || 0;
    
    return {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: language === 'ar' ? product.name_ar || product.name : product.name,
      product_sku: product.sku,
      quantity: 1,
      unit_cost: unitCost,
      discount_percent: 0,
      discount_amount: 0,
      tax_percent: 0,
      tax_amount: 0,
      total_cost: unitCost,
      product_unit_id: selectedUnit?.id,
      color_id: selectedColor?.id,
      size_name: selectedUnit?.unit_name,
      color_name: selectedColor?.color
    };
  }
  
  updateItemQuantity(items: InvoiceItem[], index: number, quantity: number): InvoiceItem[] {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    return this.recalculateItem(newItems, index);
  }
  
  updateItemPrice(items: InvoiceItem[], index: number, price: number): InvoiceItem[] {
    const newItems = [...items];
    newItems[index].unit_cost = price;
    return this.recalculateItem(newItems, index);
  }
  
  updateItemDiscount(items: InvoiceItem[], index: number, discount: number): InvoiceItem[] {
    const newItems = [...items];
    newItems[index].discount_percent = discount;
    return this.recalculateItem(newItems, index);
  }
  
  updateItemTax(items: InvoiceItem[], index: number, tax: number): InvoiceItem[] {
    const newItems = [...items];
    newItems[index].tax_percent = tax;
    return this.recalculateItem(newItems, index);
  }
  
  removeItem(items: InvoiceItem[], index: number): InvoiceItem[] {
    return items.filter((_, i) => i !== index);
  }
  
  checkDuplicateProduct(items: InvoiceItem[], productId: number, variantId?: number): number {
    return items.findIndex(item => 
      item.product_id === productId && 
      item.product_variant_id === variantId
    );
  }
  
  incrementQuantity(items: InvoiceItem[], index: number): InvoiceItem[] {
    const newItems = [...items];
    newItems[index].quantity += 1;
    return this.recalculateItem(newItems, index);
  }
  
  calculateTotals(items: InvoiceItem[]) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = items.reduce((sum, item) => sum + item.total_cost, 0);
    
    return { subtotal, totalDiscount, totalTax, total };
  }
  
  validateItems(items: InvoiceItem[]): boolean {
    return items.length > 0 && items.every(item => 
      item.product_id && 
      item.quantity > 0 && 
      item.unit_cost >= 0
    );
  }
  
  preparePayloadItems(items: InvoiceItem[]): Array<{
    product_id: number;
    product_variant_id: number | null;
    quantity: number;
    price: number;
    discount: number;
    tax: number;
    product_unit_id?: number | null;
    color_id?: number | null;
  }> {
    return items.map(item => ({
      product_id: item.product_id!,
      product_variant_id: item.product_variant_id || null,
      quantity: item.quantity,
      price: item.unit_cost,
      discount: item.discount_percent,
      tax: item.tax_percent,
      product_unit_id: item.product_unit_id || null,
      color_id: item.color_id || null
    }));
  }
}

export const productManager = ProductManager.getInstance();