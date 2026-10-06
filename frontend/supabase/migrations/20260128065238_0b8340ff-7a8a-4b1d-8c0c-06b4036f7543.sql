-- Add valuation_method column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS valuation_method TEXT DEFAULT 'fifo' CHECK (valuation_method IN ('fifo', 'lifo', 'weighted_average'));

-- Add branch_ids and warehouse_ids arrays to products table for scoping
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS branch_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS warehouse_ids UUID[] DEFAULT '{}';