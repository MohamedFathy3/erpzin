// services/productManager.service.ts
import { InvoiceItem, Product } from '@/types/purchaseform';

class ProductManager {
  private static instance: ProductManager;

  private constructor() { }

  static getInstance(): ProductManager {
    if (!ProductManager.instance) {
      ProductManager.instance = new ProductManager();
    }
    return ProductManager.instance;
  }

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

  recalculateItem(items: InvoiceItem[], index: number): InvoiceItem[] {
    const newItems = [...items];
    newItems[index] = this.calculateItemTotals(newItems[index]);
    return newItems;
  }


  createItemFromProduct(product: Product, language: string, unitId?: number, colorId?: number, stockOverride?: number): InvoiceItem {
    const selectedUnit = unitId
      ? product.units?.find(u => u.unit_id === unitId)  // unit_id مش id
      : product.units?.[0];

    // ✅ البحث عن اللون باستخدام color_id الحقيقي
    let selectedColor = null;
    let colorStock = 0;

    if (colorId && selectedUnit) {
      selectedColor = selectedUnit.colors?.find(c => c.color_id === colorId);  // color_id مش id
      colorStock = selectedColor?.stock || 0;
    }

    return {
      id: `temp-${Date.now()}-${Math.random()}`,
      product_id: product.id,
      product_variant_id: selectedColor?.id || null,
      product_name: language === 'ar' ? (product.name_ar || product.name) : product.name,
      product_sku: product.sku,
      size_name: selectedUnit?.unit_name,
      color_name: selectedColor?.color,
      color_id: colorId || null,
      product_unit_id: unitId || null,  // ✅ تأكد من تخزين unit_id
      stock: stockOverride ?? colorStock ?? product.stock ?? 0,
      quantity: 1,
      unit_cost: selectedUnit ? Number(selectedUnit.cost_price) : Number(product.cost),
      discount_percent: 0,
      discount_amount: 0,
      tax_percent: 0,
      tax_amount: 0,
      total_cost: 0,
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

  checkDuplicateProduct(
    items: InvoiceItem[],
    productId: number,
    unitId?: number,
    colorId?: number
  ): number {
    return items.findIndex(item =>
      item.product_id === productId &&
      (item.product_unit_id ?? null) === (unitId ?? null) &&
      (item.color_id ?? null) === (colorId ?? null)
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
    unit_id?: number | null;  // غيرنا من product_unit_id لـ unit_id
    color_id?: number | null;
  }> {
    return items.map(item => ({
      product_id: item.product_id,
      product_variant_id: item.product_variant_id || null,
      quantity: item.quantity,
      price: item.unit_cost,
      discount: item.discount_percent,
      tax: item.tax_percent,
      unit_id: item.product_unit_id || null,  // unit_id مش product_unit_id
      color_id: item.color_id || null
    }));
  }
}

export const productManager = ProductManager.getInstance();