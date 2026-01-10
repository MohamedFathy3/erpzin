import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

// Types for cross-module operations
interface SaleItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  discount?: number;
}

interface PurchaseItem {
  productId: string;
  variantId?: string;
  quantity: number;
  cost: number;
}

/**
 * Hook for POS <-> Inventory integration
 * Handles stock deduction when sales are completed
 */
export const usePOSInventory = () => {
  const queryClient = useQueryClient();
  const { currentWarehouse } = useApp();

  const deductStock = useMutation({
    mutationFn: async (items: SaleItem[]) => {
      const updates = items.map(async (item) => {
        if (item.variantId) {
          // Update variant stock
          const { data: variant, error: fetchError } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.variantId)
            .single();

          if (fetchError) throw fetchError;

          const newStock = Math.max(0, (variant?.stock || 0) - item.quantity);

          const { error } = await supabase
            .from('product_variants')
            .update({ stock: newStock })
            .eq('id', item.variantId);

          if (error) throw error;

          // Record movement
          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: 'sale',
            quantity: -item.quantity,
            previous_stock: variant?.stock || 0,
            new_stock: newStock,
            warehouse_id: currentWarehouse?.id,
            reference_type: 'pos_sale',
          });
        } else {
          // Update product stock
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .single();

          if (fetchError) throw fetchError;

          const newStock = Math.max(0, (product?.stock || 0) - item.quantity);

          const { error } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.productId);

          if (error) throw error;

          // Record movement
          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: 'sale',
            quantity: -item.quantity,
            previous_stock: product?.stock || 0,
            new_stock: newStock,
            warehouse_id: currentWarehouse?.id,
            reference_type: 'pos_sale',
          });
        }
      });

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
    onError: (error) => {
      console.error('Error deducting stock:', error);
      toast.error('Failed to update inventory');
    },
  });

  const restoreStock = useMutation({
    mutationFn: async (items: SaleItem[]) => {
      const updates = items.map(async (item) => {
        if (item.variantId) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.variantId)
            .single();

          const newStock = (variant?.stock || 0) + item.quantity;

          await supabase
            .from('product_variants')
            .update({ stock: newStock })
            .eq('id', item.variantId);

          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: 'return',
            quantity: item.quantity,
            previous_stock: variant?.stock || 0,
            new_stock: newStock,
            warehouse_id: currentWarehouse?.id,
            reference_type: 'pos_return',
          });
        } else {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .single();

          const newStock = (product?.stock || 0) + item.quantity;

          await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.productId);

          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: 'return',
            quantity: item.quantity,
            previous_stock: product?.stock || 0,
            new_stock: newStock,
            warehouse_id: currentWarehouse?.id,
            reference_type: 'pos_return',
          });
        }
      });

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });

  return { deductStock, restoreStock };
};

/**
 * Hook for Purchasing <-> Inventory integration
 * Handles stock increase when purchases are received
 */
export const usePurchasingInventory = () => {
  const queryClient = useQueryClient();
  const { currentWarehouse } = useApp();

  const receiveStock = useMutation({
    mutationFn: async ({ 
      items, 
      invoiceId 
    }: { 
      items: PurchaseItem[]; 
      invoiceId: string 
    }) => {
      const updates = items.map(async (item) => {
        if (item.variantId) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.variantId)
            .single();

          const newStock = (variant?.stock || 0) + item.quantity;

          await supabase
            .from('product_variants')
            .update({ stock: newStock })
            .eq('id', item.variantId);

          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: 'purchase',
            quantity: item.quantity,
            previous_stock: variant?.stock || 0,
            new_stock: newStock,
            warehouse_id: currentWarehouse?.id,
            reference_type: 'purchase_invoice',
            reference_id: invoiceId,
          });
        } else {
          const { data: product } = await supabase
            .from('products')
            .select('stock, average_cost')
            .eq('id', item.productId)
            .single();

          const newStock = (product?.stock || 0) + item.quantity;

          // Calculate new average cost
          const oldStock = product?.stock || 0;
          const oldCost = product?.average_cost || item.cost;
          const newAverageCost = oldStock > 0 
            ? ((oldStock * oldCost) + (item.quantity * item.cost)) / newStock
            : item.cost;

          await supabase
            .from('products')
            .update({ 
              stock: newStock,
              average_cost: newAverageCost,
            })
            .eq('id', item.productId);

          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: 'purchase',
            quantity: item.quantity,
            previous_stock: product?.stock || 0,
            new_stock: newStock,
            warehouse_id: currentWarehouse?.id,
            reference_type: 'purchase_invoice',
            reference_id: invoiceId,
          });
        }
      });

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] });
      toast.success('Stock received successfully');
    },
  });

  return { receiveStock };
};

/**
 * Hook for Sales <-> Finance integration
 * Creates revenue transactions for paid invoices
 */
export const useSalesFinance = () => {
  const queryClient = useQueryClient();
  const { currentBranch } = useApp();

  const recordRevenue = useMutation({
    mutationFn: async ({
      invoiceId,
      amount,
      paymentMethod,
      description,
    }: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      description?: string;
    }) => {
      const { error } = await supabase.from('revenues').insert({
        amount,
        category: 'sales',
        description: description || `Revenue from invoice`,
        payment_method: paymentMethod,
        branch_id: currentBranch?.id,
        reference_number: invoiceId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const recordExpense = useMutation({
    mutationFn: async ({
      amount,
      category,
      paymentMethod,
      description,
      referenceNumber,
    }: {
      amount: number;
      category: string;
      paymentMethod: string;
      description?: string;
      referenceNumber?: string;
    }) => {
      const { error } = await supabase.from('expenses').insert({
        amount,
        category,
        description,
        payment_method: paymentMethod,
        branch_id: currentBranch?.id,
        reference_number: referenceNumber,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  return { recordRevenue, recordExpense };
};

/**
 * Hook for HR <-> Sales integration
 * Links salesmen to invoices for commission calculation
 */
export const useHRSales = () => {
  const queryClient = useQueryClient();

  const calculateCommission = useMutation({
    mutationFn: async ({
      salesmanId,
      invoiceAmount,
      commissionRate = 0.05, // 5% default
    }: {
      salesmanId: string;
      invoiceAmount: number;
      commissionRate?: number;
    }) => {
      const commission = invoiceAmount * commissionRate;
      
      // Get current salesman data
      const { data: salesman } = await supabase
        .from('salesmen')
        .select('commission_rate')
        .eq('id', salesmanId)
        .single();

      // Use salesman's commission rate if available
      const actualRate = salesman?.commission_rate || commissionRate;
      const actualCommission = invoiceAmount * actualRate;

      return { commission: actualCommission };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesmen'] });
    },
  });

  return { calculateCommission };
};

/**
 * Hook for Dashboard aggregation
 * Fetches summary data from all modules
 */
export const useDashboardData = () => {
  const { currentBranch } = useApp();

  const fetchDashboardSummary = async () => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().setDate(1)).toISOString().split('T')[0];

    // Fetch sales data
    let salesQuery = supabase
      .from('sales')
      .select('total_amount')
      .gte('sale_date', startOfMonth);
    
    if (currentBranch) {
      salesQuery = salesQuery.eq('branch', currentBranch.name);
    }
    
    const { data: salesData } = await salesQuery;
    const totalSales = salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

    // Fetch revenue
    let revenueQuery = supabase
      .from('revenues')
      .select('amount')
      .gte('revenue_date', startOfMonth);
    
    if (currentBranch) {
      revenueQuery = revenueQuery.eq('branch_id', currentBranch.id);
    }
    
    const { data: revenueData } = await revenueQuery;
    const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

    // Fetch expenses
    let expenseQuery = supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', startOfMonth);
    
    if (currentBranch) {
      expenseQuery = expenseQuery.eq('branch_id', currentBranch.id);
    }
    
    const { data: expenseData } = await expenseQuery;
    const totalExpenses = expenseData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // Low stock alerts
    const { data: lowStockData } = await supabase
      .from('low_stock_alerts')
      .select('id')
      .eq('is_resolved', false);
    
    const lowStockCount = lowStockData?.length || 0;

    // Today's orders
    const { data: todayOrders } = await supabase
      .from('sales')
      .select('id')
      .gte('sale_date', today);
    
    const todayOrdersCount = todayOrders?.length || 0;

    // Calculate net profit
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalSales,
      totalRevenue,
      totalExpenses,
      netProfit,
      lowStockCount,
      todayOrdersCount,
    };
  };

  return { fetchDashboardSummary };
};
