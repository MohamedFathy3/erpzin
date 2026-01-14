import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteRequest {
  deleteType: 'products' | 'sales' | 'purchases' | 'customers' | 'suppliers' | 'inventory_movements' | 'all_transactions' | 'all_data';
  confirmationCode: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    )

    // Get the current user
    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !currentUser) {
      console.log('Unauthorized user attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User ${currentUser.id} attempting data deletion`)

    // Check if current user is an admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (roleData?.role !== 'admin') {
      console.log(`User ${currentUser.id} is not an admin, denying access`)
      return new Response(
        JSON.stringify({ error: 'Only system administrators can delete data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { deleteType, confirmationCode }: DeleteRequest = await req.json()

    console.log(`Admin ${currentUser.id} requesting deletion of type: ${deleteType}`)

    if (!deleteType || !confirmationCode) {
      return new Response(
        JSON.stringify({ error: 'deleteType and confirmationCode are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify confirmation code (should match "DELETE-{deleteType}")
    const expectedCode = `DELETE-${deleteType.toUpperCase()}`
    if (confirmationCode !== expectedCode) {
      console.log(`Invalid confirmation code. Expected: ${expectedCode}, Got: ${confirmationCode}`)
      return new Response(
        JSON.stringify({ error: 'Invalid confirmation code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let deletedItems: string[] = []
    let errors: string[] = []

    // Execute deletion based on type
    switch (deleteType) {
      case 'products':
        // Delete product variants first
        const { error: variantsError } = await supabaseAdmin.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (variantsError) errors.push(`product_variants: ${variantsError.message}`)
        else deletedItems.push('product_variants')

        // Delete promotion products
        const { error: promoProductsError } = await supabaseAdmin.from('promotion_products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (promoProductsError) errors.push(`promotion_products: ${promoProductsError.message}`)
        else deletedItems.push('promotion_products')

        // Delete products
        const { error: productsError } = await supabaseAdmin.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (productsError) errors.push(`products: ${productsError.message}`)
        else deletedItems.push('products')
        break

      case 'sales':
        // Delete sale items first
        const { error: saleItemsError } = await supabaseAdmin.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (saleItemsError) errors.push(`sale_items: ${saleItemsError.message}`)
        else deletedItems.push('sale_items')

        // Delete sales
        const { error: salesError } = await supabaseAdmin.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (salesError) errors.push(`sales: ${salesError.message}`)
        else deletedItems.push('sales')

        // Delete sales invoice items
        const { error: salesInvItemsError } = await supabaseAdmin.from('sales_invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (salesInvItemsError) errors.push(`sales_invoice_items: ${salesInvItemsError.message}`)
        else deletedItems.push('sales_invoice_items')

        // Delete sales invoices
        const { error: salesInvError } = await supabaseAdmin.from('sales_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (salesInvError) errors.push(`sales_invoices: ${salesInvError.message}`)
        else deletedItems.push('sales_invoices')

        // Delete sales return items
        const { error: salesRetItemsError } = await supabaseAdmin.from('sales_return_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (salesRetItemsError) errors.push(`sales_return_items: ${salesRetItemsError.message}`)
        else deletedItems.push('sales_return_items')

        // Delete sales returns
        const { error: salesRetError } = await supabaseAdmin.from('sales_returns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (salesRetError) errors.push(`sales_returns: ${salesRetError.message}`)
        else deletedItems.push('sales_returns')

        // Delete POS return items
        const { error: posRetItemsError } = await supabaseAdmin.from('pos_return_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (posRetItemsError) errors.push(`pos_return_items: ${posRetItemsError.message}`)
        else deletedItems.push('pos_return_items')

        // Delete POS returns
        const { error: posRetError } = await supabaseAdmin.from('pos_returns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (posRetError) errors.push(`pos_returns: ${posRetError.message}`)
        else deletedItems.push('pos_returns')
        break

      case 'purchases':
        // Delete purchase invoice items
        const { error: purchInvItemsError } = await supabaseAdmin.from('purchase_invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (purchInvItemsError) errors.push(`purchase_invoice_items: ${purchInvItemsError.message}`)
        else deletedItems.push('purchase_invoice_items')

        // Delete purchase invoices
        const { error: purchInvError } = await supabaseAdmin.from('purchase_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (purchInvError) errors.push(`purchase_invoices: ${purchInvError.message}`)
        else deletedItems.push('purchase_invoices')

        // Delete purchase order items
        const { error: purchOrdItemsError } = await supabaseAdmin.from('purchase_order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (purchOrdItemsError) errors.push(`purchase_order_items: ${purchOrdItemsError.message}`)
        else deletedItems.push('purchase_order_items')

        // Delete purchase orders
        const { error: purchOrdError } = await supabaseAdmin.from('purchase_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (purchOrdError) errors.push(`purchase_orders: ${purchOrdError.message}`)
        else deletedItems.push('purchase_orders')

        // Delete purchase return items
        const { error: purchRetItemsError } = await supabaseAdmin.from('purchase_return_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (purchRetItemsError) errors.push(`purchase_return_items: ${purchRetItemsError.message}`)
        else deletedItems.push('purchase_return_items')

        // Delete purchase returns
        const { error: purchRetError } = await supabaseAdmin.from('purchase_returns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (purchRetError) errors.push(`purchase_returns: ${purchRetError.message}`)
        else deletedItems.push('purchase_returns')
        break

      case 'customers':
        const { error: customersError } = await supabaseAdmin.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (customersError) errors.push(`customers: ${customersError.message}`)
        else deletedItems.push('customers')
        break

      case 'suppliers':
        const { error: suppliersError } = await supabaseAdmin.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (suppliersError) errors.push(`suppliers: ${suppliersError.message}`)
        else deletedItems.push('suppliers')
        break

      case 'inventory_movements':
        const { error: movementsError } = await supabaseAdmin.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (movementsError) errors.push(`inventory_movements: ${movementsError.message}`)
        else deletedItems.push('inventory_movements')

        // Delete opening balances
        const { error: openBalError } = await supabaseAdmin.from('opening_balances').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (openBalError) errors.push(`opening_balances: ${openBalError.message}`)
        else deletedItems.push('opening_balances')

        // Delete low stock alerts
        const { error: alertsError } = await supabaseAdmin.from('low_stock_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (alertsError) errors.push(`low_stock_alerts: ${alertsError.message}`)
        else deletedItems.push('low_stock_alerts')
        break

      case 'all_transactions':
        // Delete all transaction-related data (sales, purchases, movements, shifts)
        // This is a combination of multiple delete types
        
        // Sales data
        await supabaseAdmin.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('sales_invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('sales_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('sales_return_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('sales_returns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('pos_return_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('pos_returns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        
        // Purchase data
        await supabaseAdmin.from('purchase_invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('purchase_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('purchase_order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('purchase_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('purchase_return_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('purchase_returns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        
        // Inventory movements
        await supabaseAdmin.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('opening_balances').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('low_stock_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        
        // POS shifts
        await supabaseAdmin.from('pos_shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        
        // Financial data
        await supabaseAdmin.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('revenues').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabaseAdmin.from('bank_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        
        deletedItems.push('all_transactions')
        break

      case 'all_data':
        // Delete everything except users, roles, permissions, and company settings
        console.log('Starting complete data deletion...')
        
        // Order matters due to foreign key constraints
        const tablesToDelete = [
          'sale_items',
          'sales',
          'sales_invoice_items',
          'sales_invoices',
          'sales_return_items',
          'sales_returns',
          'pos_return_items',
          'pos_returns',
          'pos_shifts',
          'purchase_invoice_items',
          'purchase_invoices',
          'purchase_order_items',
          'purchase_orders',
          'purchase_return_items',
          'purchase_returns',
          'inventory_movements',
          'inventory_count_items',
          'inventory_counts',
          'opening_balances',
          'low_stock_alerts',
          'promotion_products',
          'promotions',
          'product_variants',
          'products',
          'categories',
          'colors',
          'sizes',
          'customers',
          'suppliers',
          'expenses',
          'revenues',
          'bank_transactions',
          'banks',
          'delivery_persons',
          'attendance',
          'employees'
        ]

        for (const table of tablesToDelete) {
          const { error } = await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
          if (error) {
            console.log(`Error deleting from ${table}: ${error.message}`)
            errors.push(`${table}: ${error.message}`)
          } else {
            console.log(`Deleted from ${table}`)
            deletedItems.push(table)
          }
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid delete type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log(`Deletion complete. Deleted: ${deletedItems.join(', ')}. Errors: ${errors.join(', ')}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Data deletion completed`,
        deletedItems,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})