-- إضافة مقاسات الملابس الإضافية
INSERT INTO sizes (code, name, name_ar, is_active) VALUES
('3XL', '3XL', '3XL', true),
('4XL', '4XL', '4XL', true),
('5XL', '5XL', '5XL', true)
ON CONFLICT (code) DO NOTHING;

-- إضافة مقاسات الأحذية الإضافية
INSERT INTO sizes (code, name, name_ar, is_active) VALUES
('35', '35', '35', true),
('46', '46', '46', true),
('47', '47', '47', true),
('48', '48', '48', true)
ON CONFLICT (code) DO NOTHING;

-- إضافة مقاسات أطفال الملابس
INSERT INTO sizes (code, name, name_ar, is_active) VALUES
('2Y', '2 Years', 'سنتين', true),
('4Y', '4 Years', '4 سنوات', true),
('6Y', '6 Years', '6 سنوات', true),
('8Y', '8 Years', '8 سنوات', true),
('10Y', '10 Years', '10 سنوات', true),
('12Y', '12 Years', '12 سنة', true),
('14Y', '14 Years', '14 سنة', true)
ON CONFLICT (code) DO NOTHING;

-- إضافة مقاسات أحذية الأطفال
INSERT INTO sizes (code, name, name_ar, is_active) VALUES
('20', '20', '20', true),
('22', '22', '22', true),
('24', '24', '24', true),
('26', '26', '26', true),
('28', '28', '28', true),
('30', '30', '30', true),
('32', '32', '32', true),
('34', '34', '34', true)
ON CONFLICT (code) DO NOTHING;

-- إضافة الألوان الجديدة
INSERT INTO colors (code, name, name_ar, hex_code, is_active) VALUES
('GLD', 'Gold', 'ذهبي', '#FFD700', true),
('SLV', 'Silver', 'فضي', '#C0C0C0', true),
('MRN', 'Maroon', 'ماروني', '#800000', true),
('OLV', 'Olive', 'زيتوني', '#808000', true),
('TRQ', 'Turquoise', 'تركوازي', '#40E0D0', true),
('CRL', 'Coral', 'مرجاني', '#FF7F50', true),
('LVN', 'Lavender', 'لافندر', '#E6E6FA', true),
('CRM', 'Cream', 'كريمي', '#FFFDD0', true),
('TAN', 'Tan', 'تان', '#D2B48C', true),
('BRG', 'Burgundy', 'بورجندي', '#722F37', true),
('MNT', 'Mint', 'نعناعي', '#98FB98', true),
('SKY', 'Sky Blue', 'سماوي', '#87CEEB', true),
('PEA', 'Peach', 'خوخي', '#FFCBA4', true),
('ROS', 'Rose', 'وردة', '#FF007F', true),
('CHR', 'Charcoal', 'فحمي', '#36454F', true),
('IVR', 'Ivory', 'عاجي', '#FFFFF0', true)
ON CONFLICT (code) DO NOTHING;