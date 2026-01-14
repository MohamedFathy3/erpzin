import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Types
interface Branch {
  id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  is_main: boolean | null;
}

interface Warehouse {
  id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  full_name_ar: string | null;
  email: string | null;
  branch_id: string | null;
  warehouse_id: string | null;
}

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
}

interface UserPermissions {
  canAccessPOS: boolean;
  canAccessSales: boolean;
  canAccessPurchasing: boolean;
  canAccessInventory: boolean;
  canAccessFinance: boolean;
  canAccessHR: boolean;
  canAccessCRM: boolean;
  canAccessSettings: boolean;
  canAccessReports: boolean;
  canProcessReturns: boolean;
  canApplyDiscounts: boolean;
  canVoidTransactions: boolean;
  role: 'admin' | 'moderator' | 'cashier' | 'viewer' | null;
}

interface AppContextType {
  // Branch Management
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch | null) => void;
  branches: Branch[];
  loadingBranches: boolean;
  
  // Warehouse Management
  currentWarehouse: Warehouse | null;
  setCurrentWarehouse: (warehouse: Warehouse | null) => void;
  warehouses: Warehouse[];
  
  // User Profile with assigned branch/warehouse
  userProfile: UserProfile | null;
  userBranch: Branch | null;
  userWarehouse: Warehouse | null;
  
  // Cart State (for POS)
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;
  
  // User Permissions
  permissions: UserPermissions;
  loadingPermissions: boolean;
  
  // Held Orders (for POS)
  heldOrders: { id: string; items: CartItem[]; customer?: string; createdAt: Date }[];
  holdCurrentOrder: (customer?: string) => void;
  recallOrder: (id: string) => void;
  removeHeldOrder: (id: string) => void;
}

const defaultPermissions: UserPermissions = {
  canAccessPOS: false,
  canAccessSales: false,
  canAccessPurchasing: false,
  canAccessInventory: false,
  canAccessFinance: false,
  canAccessHR: false,
  canAccessCRM: false,
  canAccessSettings: false,
  canAccessReports: false,
  canProcessReturns: false,
  canApplyDiscounts: false,
  canVoidTransactions: false,
  role: null,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Branch state
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  
  // Warehouse state
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // User profile with assigned branch/warehouse
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userBranch, setUserBranch] = useState<Branch | null>(null);
  const [userWarehouse, setUserWarehouse] = useState<Warehouse | null>(null);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Held orders
  const [heldOrders, setHeldOrders] = useState<{ id: string; items: CartItem[]; customer?: string; createdAt: Date }[]>([]);
  
  // Permissions state
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // Load branches and user profile
  useEffect(() => {
    const loadBranchesAndProfile = async () => {
      try {
        const { data: branchesData, error } = await supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('is_main', { ascending: false });
        
        if (error) throw error;
        
        setBranches(branchesData || []);
        
        // Load user profile with branch and warehouse
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, full_name_ar, email, branch_id, warehouse_id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileData) {
            setUserProfile(profileData);
            
            // Set user's assigned branch
            if (profileData.branch_id) {
              const assignedBranch = branchesData?.find(b => b.id === profileData.branch_id);
              if (assignedBranch) {
                setUserBranch(assignedBranch);
                setCurrentBranch(assignedBranch);
              }
            }
            
            // Load user's assigned warehouse
            if (profileData.warehouse_id) {
              const { data: warehouseData } = await supabase
                .from('warehouses')
                .select('*')
                .eq('id', profileData.warehouse_id)
                .maybeSingle();
              
              if (warehouseData) {
                setUserWarehouse(warehouseData);
                setCurrentWarehouse(warehouseData);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading branches and profile:', error);
      } finally {
        setLoadingBranches(false);
      }
    };
    
    loadBranchesAndProfile();
  }, [user]);

  // Load warehouses when branch changes
  useEffect(() => {
    const loadWarehouses = async () => {
      if (!currentBranch) {
        setWarehouses([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('*')
          .eq('is_active', true);
        
        if (error) throw error;
        
        setWarehouses(data || []);
        
        // Set first warehouse as default
        if (data && data.length > 0 && !currentWarehouse) {
          setCurrentWarehouse(data[0]);
        }
      } catch (error) {
        console.error('Error loading warehouses:', error);
      }
    };
    
    loadWarehouses();
  }, [currentBranch]);

  // Load user permissions
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) {
        setPermissions(defaultPermissions);
        setLoadingPermissions(false);
        return;
      }
      
      try {
        // Get user role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        const role = roleData?.role as 'admin' | 'moderator' | 'cashier' | 'viewer' | null;
        
        // Set permissions based on role
        const rolePermissions: Record<string, UserPermissions> = {
          admin: {
            canAccessPOS: true,
            canAccessSales: true,
            canAccessPurchasing: true,
            canAccessInventory: true,
            canAccessFinance: true,
            canAccessHR: true,
            canAccessCRM: true,
            canAccessSettings: true,
            canAccessReports: true,
            canProcessReturns: true,
            canApplyDiscounts: true,
            canVoidTransactions: true,
            role: 'admin',
          },
          moderator: {
            canAccessPOS: true,
            canAccessSales: true,
            canAccessPurchasing: true,
            canAccessInventory: true,
            canAccessFinance: true,
            canAccessHR: false,
            canAccessCRM: true,
            canAccessSettings: false,
            canAccessReports: true,
            canProcessReturns: true,
            canApplyDiscounts: true,
            canVoidTransactions: false,
            role: 'moderator',
          },
          cashier: {
            canAccessPOS: true,
            canAccessSales: true,
            canAccessPurchasing: false,
            canAccessInventory: false,
            canAccessFinance: false,
            canAccessHR: false,
            canAccessCRM: false,
            canAccessSettings: false,
            canAccessReports: false,
            canProcessReturns: true,
            canApplyDiscounts: false,
            canVoidTransactions: false,
            role: 'cashier',
          },
          viewer: {
            canAccessPOS: false,
            canAccessSales: true,
            canAccessPurchasing: false,
            canAccessInventory: true,
            canAccessFinance: false,
            canAccessHR: false,
            canAccessCRM: false,
            canAccessSettings: false,
            canAccessReports: true,
            canProcessReturns: false,
            canApplyDiscounts: false,
            canVoidTransactions: false,
            role: 'viewer',
          },
        };
        
        setPermissions(role ? rolePermissions[role] : defaultPermissions);
      } catch (error) {
        console.error('Error loading permissions:', error);
        setPermissions(defaultPermissions);
      } finally {
        setLoadingPermissions(false);
      }
    };
    
    loadPermissions();
  }, [user]);

  // Cart functions
  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = crypto.randomUUID();
    setCart(prev => {
      // Check if item already exists
      const existingIndex = prev.findIndex(
        i => i.productId === item.productId && i.variantId === item.variantId
      );
      
      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
        };
        return updated;
      }
      
      return [...prev, { ...item, id }];
    });
  }, []);

  const updateCartItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const discount = item.discount || 0;
    return sum + (itemTotal - discount);
  }, 0);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Held orders functions
  const holdCurrentOrder = useCallback((customer?: string) => {
    if (cart.length === 0) return;
    
    setHeldOrders(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        items: [...cart],
        customer,
        createdAt: new Date(),
      },
    ]);
    setCart([]);
  }, [cart]);

  const recallOrder = useCallback((id: string) => {
    const order = heldOrders.find(o => o.id === id);
    if (order) {
      setCart(order.items);
      setHeldOrders(prev => prev.filter(o => o.id !== id));
    }
  }, [heldOrders]);

  const removeHeldOrder = useCallback((id: string) => {
    setHeldOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentBranch,
        setCurrentBranch,
        branches,
        loadingBranches,
        currentWarehouse,
        setCurrentWarehouse,
        warehouses,
        userProfile,
        userBranch,
        userWarehouse,
        cart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemsCount,
        permissions,
        loadingPermissions,
        heldOrders,
        holdCurrentOrder,
        recallOrder,
        removeHeldOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
