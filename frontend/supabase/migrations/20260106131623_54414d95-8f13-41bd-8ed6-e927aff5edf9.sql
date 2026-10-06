-- Clear all related data first
DELETE FROM stock_transfer_items;
DELETE FROM stock_transfers;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM inventory_count_items;
DELETE FROM inventory_counts;
DELETE FROM inventory_movements;
DELETE FROM low_stock_alerts;
DELETE FROM opening_balances;
DELETE FROM warehouse_stock;

-- Now delete all products
DELETE FROM products;

-- Delete all categories
DELETE FROM categories;

-- Add clothing categories
INSERT INTO categories (id, name, name_ar, icon, parent_id) VALUES
('e14d0938-c669-44cb-89ab-94f9d0b89941', 'All Clothing', 'جميع الملابس', 'Shirt', NULL),
('a1000001-0000-0000-0000-000000000001', 'Men', 'رجالي', 'User', 'e14d0938-c669-44cb-89ab-94f9d0b89941'),
('a1000002-0000-0000-0000-000000000002', 'Women', 'نسائي', 'User', 'e14d0938-c669-44cb-89ab-94f9d0b89941'),
('a1000003-0000-0000-0000-000000000003', 'Kids', 'أطفال', 'Baby', 'e14d0938-c669-44cb-89ab-94f9d0b89941'),
('a1000004-0000-0000-0000-000000000004', 'T-Shirts', 'تيشيرتات', 'Shirt', 'a1000001-0000-0000-0000-000000000001'),
('a1000005-0000-0000-0000-000000000005', 'Pants', 'بناطيل', 'Scissors', 'a1000001-0000-0000-0000-000000000001'),
('a1000006-0000-0000-0000-000000000006', 'Jackets', 'جاكيتات', 'Shirt', 'a1000001-0000-0000-0000-000000000001'),
('a1000007-0000-0000-0000-000000000007', 'Dresses', 'فساتين', 'Shirt', 'a1000002-0000-0000-0000-000000000002'),
('a1000008-0000-0000-0000-000000000008', 'Blouses', 'بلوزات', 'Shirt', 'a1000002-0000-0000-0000-000000000002'),
('a1000009-0000-0000-0000-000000000009', 'Skirts', 'تنانير', 'Scissors', 'a1000002-0000-0000-0000-000000000002'),
('a1000010-0000-0000-0000-000000000010', 'Boys', 'أولاد', 'Baby', 'a1000003-0000-0000-0000-000000000003'),
('a1000011-0000-0000-0000-000000000011', 'Girls', 'بنات', 'Baby', 'a1000003-0000-0000-0000-000000000003'),
('a1000012-0000-0000-0000-000000000012', 'Accessories', 'إكسسوارات', 'Watch', NULL),
('a1000013-0000-0000-0000-000000000013', 'Bags', 'حقائب', 'ShoppingBag', 'a1000012-0000-0000-0000-000000000012'),
('a1000014-0000-0000-0000-000000000014', 'Shoes', 'أحذية', 'Footprints', NULL),
('a1000015-0000-0000-0000-000000000015', 'Men Shoes', 'أحذية رجالي', 'Footprints', 'a1000014-0000-0000-0000-000000000014'),
('a1000016-0000-0000-0000-000000000016', 'Women Shoes', 'أحذية نسائي', 'Footprints', 'a1000014-0000-0000-0000-000000000014');

-- Add clothing products with images
INSERT INTO products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url, is_active) VALUES
-- Men T-Shirts
('Classic White T-Shirt', 'تيشيرت أبيض كلاسيكي', 'MTS-001', '1000000001', 79.00, 35.00, 150, 20, 'a1000004-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', true),
('Black Cotton T-Shirt', 'تيشيرت قطن أسود', 'MTS-002', '1000000002', 85.00, 38.00, 120, 15, 'a1000004-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400', true),
('Navy Blue Polo', 'بولو أزرق كحلي', 'MTS-003', '1000000003', 120.00, 55.00, 80, 10, 'a1000004-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1625910513413-5fc5e46de30d?w=400', true),
('Striped Casual Shirt', 'قميص مخطط كاجوال', 'MTS-004', '1000000004', 145.00, 65.00, 60, 10, 'a1000004-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', true),

-- Men Pants
('Slim Fit Jeans Blue', 'جينز سليم أزرق', 'MPT-001', '1000000005', 199.00, 90.00, 100, 15, 'a1000005-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', true),
('Black Formal Trousers', 'بنطلون رسمي أسود', 'MPT-002', '1000000006', 220.00, 100.00, 70, 10, 'a1000005-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', true),
('Khaki Chinos', 'تشينو كاكي', 'MPT-003', '1000000007', 180.00, 80.00, 90, 12, 'a1000005-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400', true),

-- Men Jackets
('Leather Jacket Black', 'جاكيت جلد أسود', 'MJK-001', '1000000008', 650.00, 300.00, 30, 5, 'a1000006-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', true),
('Denim Jacket Blue', 'جاكيت جينز أزرق', 'MJK-002', '1000000009', 280.00, 130.00, 45, 8, 'a1000006-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400', true),
('Winter Puffer Jacket', 'جاكيت شتوي منفوخ', 'MJK-003', '1000000010', 450.00, 200.00, 35, 5, 'a1000006-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400', true),

-- Women Dresses
('Floral Summer Dress', 'فستان صيفي مورد', 'WDR-001', '1000000011', 320.00, 140.00, 50, 8, 'a1000007-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', true),
('Black Evening Dress', 'فستان سهرة أسود', 'WDR-002', '1000000012', 550.00, 250.00, 25, 5, 'a1000007-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', true),
('Casual Midi Dress', 'فستان ميدي كاجوال', 'WDR-003', '1000000013', 280.00, 120.00, 40, 8, 'a1000007-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400', true),

-- Women Blouses
('White Silk Blouse', 'بلوزة حرير بيضاء', 'WBL-001', '1000000014', 195.00, 85.00, 60, 10, 'a1000008-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400', true),
('Floral Print Blouse', 'بلوزة مطبوعة ورود', 'WBL-002', '1000000015', 165.00, 70.00, 55, 10, 'a1000008-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1564246544814-5f0e6d29e57d?w=400', true),

-- Women Skirts
('Pleated Midi Skirt', 'تنورة بليسيه ميدي', 'WSK-001', '1000000016', 175.00, 75.00, 45, 8, 'a1000009-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1583496661160-fb5886a0uj7a?w=400', true),
('Denim Mini Skirt', 'تنورة جينز قصيرة', 'WSK-002', '1000000017', 140.00, 60.00, 50, 10, 'a1000009-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1592301933927-35b597393c0a?w=400', true),

-- Kids Boys
('Boys Cartoon T-Shirt', 'تيشيرت أولاد كرتون', 'KBY-001', '1000000018', 65.00, 28.00, 80, 15, 'a1000010-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400', true),
('Boys Jeans Blue', 'جينز أولاد أزرق', 'KBY-002', '1000000019', 95.00, 42.00, 70, 12, 'a1000010-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400', true),

-- Kids Girls
('Girls Pink Dress', 'فستان بنات وردي', 'KGR-001', '1000000020', 120.00, 52.00, 60, 10, 'a1000011-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400', true),
('Girls Floral Skirt', 'تنورة بنات مورد', 'KGR-002', '1000000021', 85.00, 38.00, 55, 10, 'a1000011-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=400', true),

-- Bags
('Leather Handbag Brown', 'حقيبة يد جلد بني', 'BAG-001', '1000000022', 380.00, 170.00, 35, 5, 'a1000013-0000-0000-0000-000000000013', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', true),
('Canvas Tote Bag', 'حقيبة توت كانفاس', 'BAG-002', '1000000023', 95.00, 40.00, 80, 15, 'a1000013-0000-0000-0000-000000000013', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400', true),
('Backpack Black', 'حقيبة ظهر سوداء', 'BAG-003', '1000000024', 220.00, 95.00, 50, 10, 'a1000013-0000-0000-0000-000000000013', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', true),

-- Men Shoes
('Classic Leather Oxford', 'حذاء أكسفورد جلد كلاسيكي', 'MSH-001', '1000000025', 450.00, 200.00, 40, 8, 'a1000015-0000-0000-0000-000000000015', 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400', true),
('White Sneakers', 'سنيكرز أبيض', 'MSH-002', '1000000026', 280.00, 120.00, 65, 10, 'a1000015-0000-0000-0000-000000000015', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', true),
('Casual Loafers Brown', 'لوفر كاجوال بني', 'MSH-003', '1000000027', 320.00, 140.00, 45, 8, 'a1000015-0000-0000-0000-000000000015', 'https://images.unsplash.com/photo-1582897085656-c636d006a246?w=400', true),

-- Women Shoes
('High Heels Black', 'كعب عالي أسود', 'WSH-001', '1000000028', 350.00, 150.00, 35, 6, 'a1000016-0000-0000-0000-000000000016', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', true),
('Ballet Flats Nude', 'باليرينا بيج', 'WSH-002', '1000000029', 180.00, 75.00, 50, 10, 'a1000016-0000-0000-0000-000000000016', 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400', true),
('Platform Sandals', 'صندل بلاتفورم', 'WSH-003', '1000000030', 240.00, 100.00, 40, 8, 'a1000016-0000-0000-0000-000000000016', 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400', true);