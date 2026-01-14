export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          bank_id: string
          check_number: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          bank_id: string
          check_number?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          bank_id?: string
          check_number?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          account_number: string | null
          address: string | null
          balance: number | null
          branch_id: string | null
          contact_person: string | null
          created_at: string
          currency: string | null
          iban: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          notes: string | null
          phone: string | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          balance?: number | null
          branch_id?: string | null
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address?: string | null
          balance?: number | null
          branch_id?: string | null
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_warehouses: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          warehouse_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          warehouse_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_main: boolean | null
          manager_name: string | null
          name: string
          name_ar: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          manager_name?: string | null
          name: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          manager_name?: string | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          name_ar: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_ar?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          balance: number | null
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          is_header: boolean | null
          name: string
          name_ar: string | null
          notes: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          balance?: number | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_header?: boolean | null
          name: string
          name_ar?: string | null
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          balance?: number | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_header?: boolean | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          code: string
          created_at: string
          hex_code: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
        }
        Insert: {
          code: string
          created_at?: string
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          calendar_system: string | null
          commercial_register: string | null
          country: string | null
          created_at: string
          default_currency: string | null
          email: string | null
          id: string
          logo_icon_url: string | null
          logo_url: string | null
          name: string
          name_ar: string | null
          phone: string | null
          phones: string[] | null
          tax_number: string | null
          tax_rate: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          calendar_system?: string | null
          commercial_register?: string | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_icon_url?: string | null
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          phones?: string[] | null
          tax_number?: string | null
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          calendar_system?: string | null
          commercial_register?: string | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_icon_url?: string | null
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          phones?: string[] | null
          tax_number?: string | null
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          description_ar: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          name_ar: string | null
          notes: string | null
          phone: string | null
          total_purchases: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_persons: {
        Row: {
          created_at: string
          employee_id: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          name: string
          name_ar: string | null
          phone: string | null
          updated_at: string
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          name: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_persons_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          employee_code: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          phone: string | null
          position: string | null
          salary: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_items: {
        Row: {
          count_id: string
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          system_quantity: number
          variance: number | null
        }
        Insert: {
          count_id: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          system_quantity?: number
          variance?: number | null
        }
        Update: {
          count_id?: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          system_quantity?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          approved_by: string | null
          completed_date: string | null
          count_date: string
          count_number: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: string
          total_items: number | null
          updated_at: string
          variance_items: number | null
          warehouse_id: string
        }
        Insert: {
          approved_by?: string | null
          completed_date?: string | null
          count_date?: string
          count_number: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string
          variance_items?: number | null
          warehouse_id: string
        }
        Update: {
          approved_by?: string | null
          completed_date?: string | null
          count_date?: string
          count_number?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string
          variance_items?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          new_stock: number
          notes: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_quantity: number
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          product_id: string
          resolved_at: string | null
          threshold_quantity: number
          warehouse_id: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string
          current_quantity: number
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          product_id: string
          resolved_at?: string | null
          threshold_quantity: number
          warehouse_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_quantity?: number
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          product_id?: string
          resolved_at?: string | null
          threshold_quantity?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_alerts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_balances: {
        Row: {
          balance_date: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          total_value: number | null
          unit_cost: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          balance_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          total_value?: number | null
          unit_cost?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          balance_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          total_value?: number | null
          unit_cost?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          reference_label: string | null
          reference_label_ar: string | null
          requires_reference: boolean | null
          sort_order: number | null
          supported_currencies: string[] | null
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          reference_label?: string | null
          reference_label_ar?: string | null
          requires_reference?: boolean | null
          sort_order?: number | null
          supported_currencies?: string[] | null
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          reference_label?: string | null
          reference_label_ar?: string | null
          requires_reference?: boolean | null
          sort_order?: number | null
          supported_currencies?: string[] | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          description_ar: string | null
          id: string
          is_active: boolean | null
          module: string
          module_ar: string
          sort_order: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          module: string
          module_ar: string
          sort_order?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          module_ar?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      pos_return_items: {
        Row: {
          created_at: string
          id: string
          original_sale_item_id: string | null
          product_id: string | null
          product_name: string
          product_variant_id: string | null
          quantity: number
          reason: string | null
          return_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          original_sale_item_id?: string | null
          product_id?: string | null
          product_name: string
          product_variant_id?: string | null
          quantity?: number
          reason?: string | null
          return_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          original_sale_item_id?: string | null
          product_id?: string | null
          product_name?: string
          product_variant_id?: string | null
          quantity?: number
          reason?: string | null
          return_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_return_items_original_sale_item_id_fkey"
            columns: ["original_sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_return_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "pos_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_returns: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          original_invoice_number: string | null
          original_sale_id: string | null
          processed_by: string | null
          reason: string | null
          refund_method: string | null
          return_date: string
          return_number: string
          return_type: string
          shift_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          original_invoice_number?: string | null
          original_sale_id?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_method?: string | null
          return_date?: string
          return_number: string
          return_type?: string
          shift_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          original_invoice_number?: string | null
          original_sale_id?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_method?: string | null
          return_date?: string
          return_number?: string
          return_type?: string
          shift_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_returns_original_sale_id_fkey"
            columns: ["original_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_returns_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shifts: {
        Row: {
          branch_id: string | null
          card_sales: number | null
          cash_sales: number | null
          cashier_id: string | null
          closed_at: string | null
          closing_amount: number | null
          created_at: string
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_amount: number
          other_sales: number | null
          shift_number: string
          status: string
          total_returns: number | null
          total_sales: number | null
          transactions_count: number | null
          updated_at: string
          variance: number | null
          variance_notes: string | null
        }
        Insert: {
          branch_id?: string | null
          card_sales?: number | null
          cash_sales?: number | null
          cashier_id?: string | null
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          other_sales?: number | null
          shift_number: string
          status?: string
          total_returns?: number | null
          total_sales?: number | null
          transactions_count?: number | null
          updated_at?: string
          variance?: number | null
          variance_notes?: string | null
        }
        Update: {
          branch_id?: string | null
          card_sales?: number | null
          cash_sales?: number | null
          cashier_id?: string | null
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          other_sales?: number | null
          shift_number?: string
          status?: string
          total_returns?: number | null
          total_sales?: number | null
          transactions_count?: number | null
          updated_at?: string
          variance?: number | null
          variance_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      product_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_log: Json | null
          failed_rows: number
          file_name: string
          id: string
          status: string
          successful_rows: number
          total_rows: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          failed_rows?: number
          file_name: string
          id?: string
          status?: string
          successful_rows?: number
          total_rows?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          failed_rows?: number
          file_name?: string
          id?: string
          status?: string
          successful_rows?: number
          total_rows?: number
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          barcode: string | null
          color_id: string | null
          cost_adjustment: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          price_adjustment: number | null
          product_id: string
          size_id: string | null
          sku: string
          stock: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          color_id?: string | null
          cost_adjustment?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id: string
          size_id?: string | null
          sku: string
          stock?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          color_id?: string | null
          cost_adjustment?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id?: string
          size_id?: string | null
          sku?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          average_cost: number | null
          barcode: string | null
          category_id: string | null
          cost: number | null
          created_at: string
          has_variants: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_stock: number | null
          name: string
          name_ar: string | null
          price: number
          sku: string
          stock: number
          updated_at: string
        }
        Insert: {
          average_cost?: number | null
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          has_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock?: number | null
          name: string
          name_ar?: string | null
          price?: number
          sku: string
          stock?: number
          updated_at?: string
        }
        Update: {
          average_cost?: number | null
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          has_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock?: number | null
          name?: string
          name_ar?: string | null
          price?: number
          sku?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          full_name_ar: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          preferred_language: string | null
          updated_at: string
          username: string | null
          warehouse_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          username?: string | null
          warehouse_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          username?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_variant_id: string | null
          promotion_id: string
          special_discount_value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_variant_id?: string | null
          promotion_id: string
          special_discount_value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_variant_id?: string | null
          promotion_id?: string
          special_discount_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_quantity: number | null
          name: string
          name_ar: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_quantity?: number | null
          name: string
          name_ar?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_quantity?: number | null
          name?: string
          name_ar?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoice_items: {
        Row: {
          created_at: string
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_id: string
          notes: string | null
          product_id: string | null
          product_variant_id: string | null
          quantity: number
          tax_amount: number | null
          tax_percent: number | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id: string
          notes?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          tax_amount?: number | null
          tax_percent?: number | null
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          notes?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          tax_amount?: number | null
          tax_percent?: number | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          purchase_order_id: string | null
          remaining_amount: number | null
          subtotal: number
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_order_id?: string | null
          remaining_amount?: number | null
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_order_id?: string | null
          remaining_amount?: number | null
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          received_quantity?: number | null
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          received_date: string | null
          status: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          received_date?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          received_date?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          created_at: string
          id: string
          original_item_id: string | null
          product_id: string | null
          product_name: string
          product_variant_id: string | null
          quantity: number
          reason: string | null
          return_id: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          original_item_id?: string | null
          product_id?: string | null
          product_name: string
          product_variant_id?: string | null
          quantity?: number
          reason?: string | null
          return_id: string
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          original_item_id?: string | null
          product_id?: string | null
          product_name?: string
          product_variant_id?: string | null
          quantity?: number
          reason?: string | null
          return_id?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_original_item_id_fkey"
            columns: ["original_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          branch_id: string | null
          created_at: string
          discount_amount: number | null
          id: string
          notes: string | null
          original_invoice_id: string | null
          original_invoice_number: string | null
          processed_by: string | null
          reason: string | null
          refund_method: string | null
          refund_status: string | null
          return_date: string
          return_number: string
          status: string | null
          subtotal: number
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_method?: string | null
          refund_status?: string | null
          return_date?: string
          return_number: string
          status?: string | null
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_method?: string | null
          refund_status?: string | null
          return_date?: string
          return_number?: string
          status?: string | null
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      revenues: {
        Row: {
          account_id: string | null
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          payment_method: string | null
          reference_number: string | null
          revenue_date: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_number?: string | null
          revenue_date?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_number?: string | null
          revenue_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenues_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          permission_id: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number | null
          id: string
          product_id: string | null
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number | null
          id: string
          invoice_number: string
          notes: string | null
          payment_method: string | null
          sale_date: string
          status: string | null
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          branch?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number: string
          notes?: string | null
          payment_method?: string | null
          sale_date?: string
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Update: {
          branch?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number?: string
          notes?: string | null
          payment_method?: string | null
          sale_date?: string
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_items: {
        Row: {
          created_at: string
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_id: string
          notes: string | null
          product_id: string | null
          product_name: string
          product_variant_id: string | null
          quantity: number
          sku: string | null
          tax_amount: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          product_variant_id?: string | null
          quantity?: number
          sku?: string | null
          tax_amount?: number | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          product_variant_id?: string | null
          quantity?: number
          sku?: string | null
          tax_amount?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount_amount: number | null
          discount_percent: number | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          remaining_amount: number | null
          salesman_id: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_percent: number | null
          total_amount: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_amount?: number | null
          discount_percent?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type?: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          remaining_amount?: number | null
          salesman_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_percent?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_amount?: number | null
          discount_percent?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          remaining_amount?: number | null
          salesman_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_percent?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          created_at: string
          id: string
          original_item_id: string | null
          product_id: string | null
          product_name: string
          product_variant_id: string | null
          quantity: number
          reason: string | null
          return_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          original_item_id?: string | null
          product_id?: string | null
          product_name: string
          product_variant_id?: string | null
          quantity?: number
          reason?: string | null
          return_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          original_item_id?: string | null
          product_id?: string | null
          product_name?: string
          product_variant_id?: string | null
          quantity?: number
          reason?: string | null
          return_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          invoice_type: string | null
          notes: string | null
          original_invoice_id: string | null
          original_invoice_number: string | null
          processed_by: string | null
          reason: string | null
          refund_method: string | null
          return_date: string
          return_number: string
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_type?: string | null
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_method?: string | null
          return_date?: string
          return_number: string
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_type?: string | null
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_method?: string | null
          return_date?: string
          return_number?: string
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      salesmen: {
        Row: {
          branch_id: string | null
          commission_rate: number | null
          created_at: string
          email: string | null
          employee_id: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesmen_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salesmen_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sizes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      stock_transfer_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          received_quantity: number | null
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          received_quantity?: number | null
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          received_quantity?: number | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          notes: string | null
          status: string
          to_warehouse_id: string
          total_items: number | null
          total_quantity: number | null
          transfer_date: string
          transfer_number: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          notes?: string | null
          status?: string
          to_warehouse_id: string
          total_items?: number | null
          total_quantity?: number | null
          transfer_date?: string
          transfer_number: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_warehouse_id?: string
          total_items?: number | null
          total_quantity?: number | null
          transfer_date?: string
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_number: string
          reference_number: string | null
          supplier_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number: string
          reference_number?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number?: string
          reference_number?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          supplier_id: string
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          supplier_id: string
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          supplier_id?: string
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          payment_terms: number | null
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          payment_terms?: number | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          payment_terms?: number | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          name_ar: string | null
          rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          name_ar?: string | null
          rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          name_ar?: string | null
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      treasuries: {
        Row: {
          balance: number | null
          branch_id: string | null
          code: string | null
          created_at: string
          currency: string | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          name: string
          name_ar: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          balance?: number | null
          branch_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name: string
          name_ar?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number | null
          branch_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasuries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
          treasury_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type: string
          treasury_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
          treasury_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_transactions_treasury_id_fkey"
            columns: ["treasury_id"]
            isOneToOne: false
            referencedRelation: "treasuries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouse_stock: {
        Row: {
          id: string
          last_updated: string
          max_quantity: number | null
          min_quantity: number | null
          product_id: string
          quantity: number
          warehouse_id: string
        }
        Insert: {
          id?: string
          last_updated?: string
          max_quantity?: number | null
          min_quantity?: number | null
          product_id: string
          quantity?: number
          warehouse_id: string
        }
        Update: {
          id?: string
          last_updated?: string
          max_quantity?: number | null
          min_quantity?: number | null
          product_id?: string
          quantity?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_main: boolean | null
          manager_name: string | null
          name: string
          name_ar: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          manager_name?: string | null
          name: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          manager_name?: string | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_count_number: { Args: never; Returns: string }
      generate_payment_number: { Args: never; Returns: string }
      generate_purchase_invoice_number: { Args: never; Returns: string }
      generate_purchase_return_number: { Args: never; Returns: string }
      generate_return_number: { Args: never; Returns: string }
      generate_sales_invoice_number: { Args: never; Returns: string }
      generate_sales_return_number: { Args: never; Returns: string }
      generate_shift_number: { Args: never; Returns: string }
      generate_transfer_number: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "cashier" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "cashier", "viewer"],
    },
  },
} as const
