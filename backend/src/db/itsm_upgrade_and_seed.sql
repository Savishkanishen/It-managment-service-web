-- =============================================================================
-- IT Service Management Platform (ITSM) — Schema Upgrade & Seed Data
-- Database: itsm_db
-- Schema: itsm
-- Can be executed safely in pgAdmin or psql (Idempotent)
-- =============================================================================

SET search_path TO itsm, public;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- 2. SCHEMA ALTERATIONS & ENHANCEMENTS (IF NOT EXISTS)
DO $$
BEGIN
  -- itsm.stock_items enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='stock_items' AND column_name='status') THEN
    ALTER TABLE itsm.stock_items ADD COLUMN status character varying(30) DEFAULT 'Available' NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='stock_items' AND column_name='updated_at') THEN
    ALTER TABLE itsm.stock_items ADD COLUMN updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='stock_items' AND column_name='updated_by') THEN
    ALTER TABLE itsm.stock_items ADD COLUMN updated_by character varying(100);
  END IF;

  -- itsm.tickets enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tickets' AND column_name='notes') THEN
    ALTER TABLE itsm.tickets ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tickets' AND column_name='reassignment_request') THEN
    ALTER TABLE itsm.tickets ADD COLUMN reassignment_request jsonb DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tickets' AND column_name='parts_used') THEN
    ALTER TABLE itsm.tickets ADD COLUMN parts_used jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- itsm.tasks enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tasks' AND column_name='start_date') THEN
    ALTER TABLE itsm.tasks ADD COLUMN start_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tasks' AND column_name='project') THEN
    ALTER TABLE itsm.tasks ADD COLUMN project character varying(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tasks' AND column_name='department') THEN
    ALTER TABLE itsm.tasks ADD COLUMN department character varying(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tasks' AND column_name='assignees') THEN
    ALTER TABLE itsm.tasks ADD COLUMN assignees jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tasks' AND column_name='subtasks') THEN
    ALTER TABLE itsm.tasks ADD COLUMN subtasks jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tasks' AND column_name='hold_reason') THEN
    ALTER TABLE itsm.tasks ADD COLUMN hold_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='tasks' AND column_name='updated_at') THEN
    ALTER TABLE itsm.tasks ADD COLUMN updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- itsm.repairs enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='gate_pass') THEN
    ALTER TABLE itsm.repairs ADD COLUMN gate_pass character varying(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='for_reason') THEN
    ALTER TABLE itsm.repairs ADD COLUMN for_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='initial_diagnosis') THEN
    ALTER TABLE itsm.repairs ADD COLUMN initial_diagnosis text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='what_replaced') THEN
    ALTER TABLE itsm.repairs ADD COLUMN what_replaced text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='total_cost') THEN
    ALTER TABLE itsm.repairs ADD COLUMN total_cost numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='invoice') THEN
    ALTER TABLE itsm.repairs ADD COLUMN invoice character varying(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='notes') THEN
    ALTER TABLE itsm.repairs ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='repairs' AND column_name='dispatch_date') THEN
    ALTER TABLE itsm.repairs ADD COLUMN dispatch_date date;
  END IF;

  -- itsm.publications enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='publications' AND column_name='published_by') THEN
    ALTER TABLE itsm.publications ADD COLUMN published_by uuid REFERENCES itsm.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='publications' AND column_name='attachments') THEN
    ALTER TABLE itsm.publications ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='publications' AND column_name='requested_at') THEN
    ALTER TABLE itsm.publications ADD COLUMN requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- itsm.zoom_requests enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='zoom_requests' AND column_name='location') THEN
    ALTER TABLE itsm.zoom_requests ADD COLUMN location character varying(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='zoom_requests' AND column_name='meeting_level') THEN
    ALTER TABLE itsm.zoom_requests ADD COLUMN meeting_level character varying(50) DEFAULT 'Medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='zoom_requests' AND column_name='required_equipment') THEN
    ALTER TABLE itsm.zoom_requests ADD COLUMN required_equipment jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='zoom_requests' AND column_name='link_uploaded_by') THEN
    ALTER TABLE itsm.zoom_requests ADD COLUMN link_uploaded_by uuid REFERENCES itsm.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='zoom_requests' AND column_name='link_uploaded_at') THEN
    ALTER TABLE itsm.zoom_requests ADD COLUMN link_uploaded_at timestamp with time zone;
  END IF;
END $$;

-- 3. DIVISIONS SEED
INSERT INTO itsm.divisions (id, name, code)
VALUES 
  ('072cebb7-0d11-4569-8353-203d1610ce12', 'Information Technology', 'IT'),
  ('8c457efe-ea8e-4438-a42c-d1d29280f67d', 'Human Resources', 'HR'),
  ('5514fd48-7d2b-4c4d-9c75-b62b50e917eb', 'Finance', 'FIN'),
  ('11111111-1111-1111-1111-111111111101', 'Academic Affairs Division', 'AAD'),
  ('11111111-1111-1111-1111-111111111102', 'Legal Division', 'LEG'),
  ('11111111-1111-1111-1111-111111111103', 'Planning & Statistics Division', 'PSD'),
  ('11111111-1111-1111-1111-111111111104', 'Administration Division', 'ADM'),
  ('11111111-1111-1111-1111-111111111105', 'Minister''s Office', 'MIN'),
  ('11111111-1111-1111-1111-111111111106', 'Quality Assurance Division', 'QAD')
ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code;

-- 4. ROLES SEED
INSERT INTO itsm.roles (id, name, description)
VALUES 
  ('eb723779-f2cd-458d-bfd6-9eb89ef80d74', 'Super Admin', 'Full system access'),
  ('60441f29-8089-4c9b-bb35-3b9513921398', 'IT Admin', 'IT asset and ticket management'),
  ('d4113ef4-4ca2-485f-8f1e-502a7dfc0d7f', 'Trainee', 'Limited viewing access'),
  ('1d93a2b8-7a4b-47bc-817c-79f9d75558a6', 'Zoom Requester', 'Can only request Zoom meetings')
ON CONFLICT (name) DO NOTHING;

-- 5. USERS SEED (Including student group members)
INSERT INTO itsm.users (id, username, email, display_name, password_hash, division_id, role_id, is_active)
VALUES
  ('ed08ee60-c54b-40f5-8273-34c5439eaa8b', 'superadmin', 'super@ministry.gov', 'Super Administrator', 'password123', '072cebb7-0d11-4569-8353-203d1610ce12', 'eb723779-f2cd-458d-bfd6-9eb89ef80d74', true),
  ('cf9ee99c-d1dc-4805-8b25-69909a366d58', 'itadmin', 'it@ministry.gov', 'IT Admin', 'password123', '072cebb7-0d11-4569-8353-203d1610ce12', '60441f29-8089-4c9b-bb35-3b9513921398', true),
  ('34729a84-291c-459c-ac51-e62d5000e01c', 'intern', 'intern@ministry.gov', 'IT Trainee', 'password123', '072cebb7-0d11-4569-8353-203d1610ce12', 'd4113ef4-4ca2-485f-8f1e-502a7dfc0d7f', true),
  ('68783080-af72-4144-a3cc-2ab166fc0446', 'zoomuser', 'zoom@ministry.gov', 'Zoom User', 'password123', '11111111-1111-1111-1111-111111111101', '1d93a2b8-7a4b-47bc-817c-79f9d75558a6', true),
  ('22222222-2222-2222-2222-222222222201', 'sachin', 'sachin@mohe.gov.mv', 'Sachin', 'password123', '072cebb7-0d11-4569-8353-203d1610ce12', 'd4113ef4-4ca2-485f-8f1e-502a7dfc0d7f', true),
  ('22222222-2222-2222-2222-222222222202', 'hirantha', 'hirantha@mohe.gov.mv', 'Hirantha', 'password123', '072cebb7-0d11-4569-8353-203d1610ce12', 'd4113ef4-4ca2-485f-8f1e-502a7dfc0d7f', true),
  ('22222222-2222-2222-2222-222222222203', 'shalom', 'shalom@mohe.gov.mv', 'Shalom', 'password123', '072cebb7-0d11-4569-8353-203d1610ce12', 'd4113ef4-4ca2-485f-8f1e-502a7dfc0d7f', true),
  ('22222222-2222-2222-2222-222222222204', 'savishka', 'savishka@mohe.gov.mv', 'Savishka', 'password123', '072cebb7-0d11-4569-8353-203d1610ce12', 'd4113ef4-4ca2-485f-8f1e-502a7dfc0d7f', true)
ON CONFLICT (username) DO UPDATE SET 
  division_id = EXCLUDED.division_id,
  role_id = EXCLUDED.role_id,
  display_name = EXCLUDED.display_name;

-- 6. VENDORS SEED
INSERT INTO itsm.vendors (id, name, specialization, contact_details, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333301', 'TechFix Maldives', 'PC, Laptops, Servers', 'Contact: Ali Hassan | Phone: +960 300-1234 | Email: ali@techfix.mv | Male, Maldives', true),
  ('33333333-3333-3333-3333-333333333302', 'Office Solutions Pvt Ltd', 'Printers, Photocopiers', 'Contact: Ibrahim Rauf | Phone: +960 300-5678 | Email: info@officesolutions.mv | Male, Maldives', true),
  ('33333333-3333-3333-3333-333333333303', 'NetWorld Technologies', 'Network Equipment, Switches', 'Contact: Fathimath Isha | Phone: +960 300-9012 | Email: networld@mv.net | Male, Maldives', true)
ON CONFLICT (name) DO NOTHING;

-- 7. ASSETS SEED
INSERT INTO itsm.assets (id, asset_tag, asset_type, serial_number, brand_model, status, division_id, assigned_user_id, specs)
VALUES
  ('44444444-4444-4444-4444-444444444401', 'MOHE-PC-0001', 'PC', 'SN-DELL-001', 'Dell OptiPlex 7090', 'Active', '072cebb7-0d11-4569-8353-203d1610ce12', '22222222-2222-2222-2222-222222222202', '{"brand":"Dell","model":"OptiPlex 7090","cpu":"Intel Core i7-11700","ram":"16GB DDR4","storage":"512GB NVMe SSD","os":"Windows 11 Pro","ip":"192.168.1.10","location":"Server Room","purchaseDate":"2022-03-15"}'),
  ('44444444-4444-4444-4444-444444444402', 'MOHE-PC-0002', 'PC', 'SN-HP-001', 'HP EliteDesk 800 G8', 'Active', '5514fd48-7d2b-4c4d-9c75-b62b50e917eb', '22222222-2222-2222-2222-222222222201', '{"brand":"HP","model":"EliteDesk 800 G8","cpu":"Intel Core i5-11500","ram":"8GB DDR4","storage":"256GB SSD","os":"Windows 10 Pro","ip":"192.168.1.25","location":"Finance Block","purchaseDate":"2021-07-20"}'),
  ('44444444-4444-4444-4444-444444444403', 'MOHE-PC-0003', 'PC', 'SN-LENOVO-001', 'Lenovo ThinkCentre M80q', 'Maintenance', '8c457efe-ea8e-4438-a42c-d1d29280f67d', '22222222-2222-2222-2222-222222222204', '{"brand":"Lenovo","model":"ThinkCentre M80q","cpu":"Intel Core i5-10400","ram":"8GB DDR4","storage":"256GB SSD","os":"Windows 10 Pro","ip":"192.168.1.30","location":"HR Block","purchaseDate":"2020-11-10"}'),
  ('44444444-4444-4444-4444-444444444404', 'MOHE-LT-0001', 'Laptop', 'SN-DELL-LT-001', 'Dell Latitude 5520', 'Active', '072cebb7-0d11-4569-8353-203d1610ce12', '22222222-2222-2222-2222-222222222201', '{"brand":"Dell","model":"Latitude 5520","cpu":"Intel Core i7-1165G7","ram":"16GB DDR4","storage":"512GB NVMe","os":"Windows 11 Pro","ip":"192.168.1.50","location":"IT Office","purchaseDate":"2022-01-05"}'),
  ('44444444-4444-4444-4444-444444444405', 'MOHE-LT-0002', 'Laptop', 'SN-HP-LT-001', 'HP EliteBook 840 G8', 'Active', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222203', '{"brand":"HP","model":"EliteBook 840 G8","cpu":"Intel Core i5-1135G7","ram":"8GB DDR4","storage":"256GB SSD","os":"Windows 10 Pro","ip":"192.168.1.55","location":"Academic Block","purchaseDate":"2021-09-12"}'),
  ('44444444-4444-4444-4444-444444444406', 'MOHE-LT-0003', 'Laptop', 'SN-LENOVO-LT-001', 'Lenovo ThinkPad T14s', 'Active', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '{"brand":"Lenovo","model":"ThinkPad T14s","cpu":"AMD Ryzen 5 PRO 5650U","ram":"16GB DDR4","storage":"512GB SSD","os":"Windows 11 Pro","ip":"192.168.1.60","location":"Planning Block","purchaseDate":"2023-02-18"}'),
  ('44444444-4444-4444-4444-444444444407', 'MOHE-PR-0001', 'Printer', 'SN-CANON-001', 'Canon imageRUNNER 2630i', 'Active', '5514fd48-7d2b-4c4d-9c75-b62b50e917eb', NULL, '{"brand":"Canon","model":"imageRUNNER 2630i","ip":"192.168.1.100","location":"Finance Division","connectionType":"Network","purchaseDate":"2021-03-10"}'),
  ('44444444-4444-4444-4444-444444444408', 'MOHE-PR-0002', 'Printer', 'SN-HP-PR-001', 'HP LaserJet Pro MFP M428', 'Maintenance', '8c457efe-ea8e-4438-a42c-d1d29280f67d', NULL, '{"brand":"HP","model":"LaserJet Pro MFP M428","location":"HR Division","connectionType":"USB","purchaseDate":"2020-08-22"}')
ON CONFLICT (asset_tag) DO NOTHING;

-- 8. STOCK ITEMS SEED
INSERT INTO itsm.stock_items (id, name, category, unit, quantity, min_threshold, status, updated_by)
VALUES
  ('55555555-5555-5555-5555-555555555501', 'Seagate 1TB HDD (2.5")', 'HDD', 'units', 8, 3, 'Available', 'Sachin'),
  ('55555555-5555-5555-5555-555555555502', 'WD 2TB HDD (3.5")', 'HDD', 'units', 2, 3, 'Low Stock', 'Sachin'),
  ('55555555-5555-5555-5555-555555555503', 'Kingston 8GB DDR4 2666MHz', 'RAM', 'sticks', 12, 5, 'Available', 'Savishka'),
  ('55555555-5555-5555-5555-555555555504', 'Corsair 16GB DDR4 3200MHz', 'RAM', 'sticks', 0, 2, 'Not Available', 'Sachin'),
  ('55555555-5555-5555-5555-555555555505', 'Logitech M100 Wired Mouse', 'Mouse', 'units', 15, 5, 'Available', 'Savishka'),
  ('55555555-5555-5555-5555-555555555506', 'HP K1500 Wired Keyboard', 'Keyboard', 'units', 10, 4, 'Available', 'Savishka'),
  ('55555555-5555-5555-5555-555555555507', 'TP-Link AC1300 USB Adapter', 'Wi-Fi Adapter', 'units', 4, 2, 'Available', 'Sachin'),
  ('55555555-5555-5555-5555-555555555508', 'Cat6 Network Cable (3m)', 'Network Cable', 'pcs', 25, 10, 'Available', 'Savishka'),
  ('55555555-5555-5555-5555-555555555509', 'Cat6 Network Cable (1m)', 'Network Cable', 'pcs', 8, 10, 'Low Stock', 'Sachin'),
  ('55555555-5555-5555-5555-555555555510', 'Standard IEC Power Cable (1.5m)', 'Power Cable', 'pcs', 20, 8, 'Available', 'Savishka'),
  ('55555555-5555-5555-5555-555555555511', 'HDMI 2.0 Cable (1.5m)', 'HDMI Cable', 'pcs', 0, 5, 'Not Available', 'Sachin'),
  ('55555555-5555-5555-5555-555555555512', 'VGA to VGA Cable (1.8m)', 'VGA Cable', 'pcs', 7, 3, 'Available', 'Savishka')
ON CONFLICT (id) DO NOTHING;

-- 9. TICKETS SEED
INSERT INTO itsm.tickets (id, ticket_number, title, description, category, priority, status, requester_id, assignee_id, asset_id, division_id, notes, reassignment_request, parts_used)
VALUES
  (
    '66666666-6666-6666-6666-666666666601', 'TKT-2026-001', 'PC not powering on',
    'The PC in Finance Block Room 203 is not starting up at all. The power button shows no response.',
    'Hardware', 'High', 'In Progress',
    'cf9ee99c-d1dc-4805-8b25-69909a366d58', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444402', '5514fd48-7d2b-4c4d-9c75-b62b50e917eb',
    'PSU suspected. Checking power supply unit.', NULL, '[]'::jsonb
  ),
  (
    '66666666-6666-6666-6666-666666666602', 'TKT-2026-002', 'Microsoft Office license expired',
    'Office 365 license has expired on the planning division laptop. User cannot open Word or Excel.',
    'Software', 'Medium', 'Resolved',
    'cf9ee99c-d1dc-4805-8b25-69909a366d58', '22222222-2222-2222-2222-222222222202', '44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111103',
    'License renewed through IT Admin portal. Tested successfully.', NULL, '[]'::jsonb
  ),
  (
    '66666666-6666-6666-6666-666666666603', 'TKT-2026-003', 'No internet access — HR Division',
    'Multiple computers in the HR Division lost internet access simultaneously. Suspected switch or DHCP issue.',
    'Network', 'High', 'Pending Parts',
    'cf9ee99c-d1dc-4805-8b25-69909a366d58', '22222222-2222-2222-2222-222222222203', NULL, '8c457efe-ea8e-4438-a42c-d1d29280f67d',
    'Switch port issue. Replacement switch module required.',
    '{"id":"RR-001","requestedBy":"22222222-2222-2222-2222-222222222203","reason":"Network hardware replacement requires specialized skills I am not yet trained in.","requestedAt":"2026-09-15T10:00:00Z","status":"Pending"}',
    '[]'::jsonb
  ),
  (
    '66666666-6666-6666-6666-666666666604', 'TKT-2026-004', 'Printer offline — Canon iR 2630i',
    'The Canon printer in Finance Division is showing offline. Users unable to print.',
    'PC/Printer', 'Medium', 'New',
    'cf9ee99c-d1dc-4805-8b25-69909a366d58', '22222222-2222-2222-2222-222222222204', '44444444-4444-4444-4444-444444444407', '5514fd48-7d2b-4c4d-9c75-b62b50e917eb',
    NULL, NULL, '[]'::jsonb
  ),
  (
    '66666666-6666-6666-6666-666666666605', 'TKT-2026-005', 'Laptop screen flickering',
    'Dell Latitude 5520 screen flickers intermittently. Suspected display cable loose.',
    'Hardware', 'Low', 'Assigned',
    'cf9ee99c-d1dc-4805-8b25-69909a366d58', '22222222-2222-2222-2222-222222222202', '44444444-4444-4444-4444-444444444404', '072cebb7-0d11-4569-8353-203d1610ce12',
    NULL, NULL, '[]'::jsonb
  ),
  (
    '66666666-6666-6666-6666-666666666606', 'TKT-2026-006', 'Windows update stuck at 87%',
    'PC in HR Division stuck on Windows update. System unresponsive after restart.',
    'Software', 'Medium', 'Closed',
    'cf9ee99c-d1dc-4805-8b25-69909a366d58', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444403', '8c457efe-ea8e-4438-a42c-d1d29280f67d',
    'Safe mode recovery used. Update re-run successfully.', NULL, '[]'::jsonb
  )
ON CONFLICT (ticket_number) DO NOTHING;

-- 10. REPAIRS SEED
INSERT INTO itsm.repairs (id, reference_number, asset_id, vendor_id, issue_description, status, dispatched_by, expected_return, dispatch_date, gate_pass, for_reason, initial_diagnosis, what_replaced, total_cost, invoice, notes)
VALUES
  (
    '77777777-7777-7777-7777-777777777701', 'REP-2026-001', '44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301',
    'Motherboard failure — system not booting past POST screen', 'Overdue', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', '2026-09-15', '2026-09-05', 'GP-2026-053',
    'Motherboard failure — system not booting past POST screen', 'Suspected fried capacitor on motherboard', NULL, NULL, NULL, 'Awaiting component arrival from supplier'
  ),
  (
    '77777777-7777-7777-7777-777777777702', 'REP-2026-002', '44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333302',
    'Paper jam mechanism failure and drum unit worn out', 'Closed', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', '2026-09-01', '2026-08-20', 'GP-2026-041',
    'Paper jam mechanism failure and drum unit worn out', 'Drum unit and pickup rollers require replacement', 'Drum Unit (HP CF217A), Pickup Rollers (RM2-5452)', 450.00, 'INV-REP-2026-002.pdf', 'Repaired and returned. Tested 50 pages — working fine.'
  )
ON CONFLICT (reference_number) DO NOTHING;

-- 11. TASKS SEED
INSERT INTO itsm.tasks (id, task_number, title, description, priority, status, created_by, due_date, start_date, project, department, assignees, subtasks)
VALUES
  (
    '88888888-8888-8888-8888-888888888801', 'TSK-2026-001', 'Network Infrastructure Upgrade — Finance Block',
    'Complete Cat6 cabling replacement and switch installation across Finance Block (3 floors, 45 ports)',
    'High', 'In Progress', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', '2026-09-30', '2026-09-01', 'Network Upgrade 2026', 'IT Department',
    '["22222222-2222-2222-2222-222222222201", "22222222-2222-2222-2222-222222222202"]'::jsonb,
    '[
      {"id": "SUB-001-1", "title": "Floor 1 cabling survey & labeling", "assignee": "22222222-2222-2222-2222-222222222201", "dueDate": "2026-09-05", "status": "Completed", "completedAt": "2026-09-04T16:00:00Z"},
      {"id": "SUB-001-2", "title": "Floor 2 cabling installation", "assignee": "22222222-2222-2222-2222-222222222202", "dueDate": "2026-09-15", "status": "Completed", "completedAt": "2026-09-14T15:30:00Z"},
      {"id": "SUB-001-3", "title": "Floor 3 cabling installation", "assignee": "22222222-2222-2222-2222-222222222201", "dueDate": "2026-09-22", "status": "In Progress", "completedAt": null},
      {"id": "SUB-001-4", "title": "Switch configuration and testing", "assignee": "22222222-2222-2222-2222-222222222202", "dueDate": "2026-09-28", "status": "To Do", "completedAt": null},
      {"id": "SUB-001-5", "title": "Documentation and sign-off", "assignee": "22222222-2222-2222-2222-222222222201", "dueDate": "2026-09-30", "status": "To Do", "completedAt": null}
    ]'::jsonb
  ),
  (
    '88888888-8888-8888-8888-888888888802', 'TSK-2026-002', 'PC Asset Tagging & Inventory Audit',
    'Physical audit of all PCs and laptops across Ministry divisions. Update asset register with current status.',
    'Medium', 'In Progress', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', '2026-09-25', '2026-09-10', 'Asset Management', 'IT Department',
    '["22222222-2222-2222-2222-222222222203", "22222222-2222-2222-2222-222222222204"]'::jsonb,
    '[
      {"id": "SUB-002-1", "title": "Audit IT Department assets", "assignee": "22222222-2222-2222-2222-222222222203", "dueDate": "2026-09-12", "status": "Completed", "completedAt": "2026-09-11T15:00:00Z"},
      {"id": "SUB-002-2", "title": "Audit Finance Division assets", "assignee": "22222222-2222-2222-2222-222222222204", "dueDate": "2026-09-18", "status": "In Progress", "completedAt": null},
      {"id": "SUB-002-3", "title": "Audit HR Division assets", "assignee": "22222222-2222-2222-2222-222222222203", "dueDate": "2026-09-22", "status": "To Do", "completedAt": null},
      {"id": "SUB-002-4", "title": "Update database and generate report", "assignee": "22222222-2222-2222-2222-222222222204", "dueDate": "2026-09-25", "status": "To Do", "completedAt": null}
    ]'::jsonb
  ),
  (
    '88888888-8888-8888-8888-888888888803', 'TSK-2026-003', 'IT Security Policy Documentation',
    'Draft and finalize the Ministry IT Security Policy document including password policy, device usage, and incident response.',
    'Urgent', 'To Do', 'ed08ee60-c54b-40f5-8273-34c5439eaa8b', '2026-09-20', '2026-09-16', 'IT Governance 2026', 'IT Department',
    '["22222222-2222-2222-2222-222222222201", "22222222-2222-2222-2222-222222222202", "22222222-2222-2222-2222-222222222203", "22222222-2222-2222-2222-222222222204"]'::jsonb,
    '[
      {"id": "SUB-003-1", "title": "Draft password & access policy", "assignee": "22222222-2222-2222-2222-222222222201", "dueDate": "2026-09-17", "status": "To Do", "completedAt": null},
      {"id": "SUB-003-2", "title": "Draft device usage policy", "assignee": "22222222-2222-2222-2222-222222222202", "dueDate": "2026-09-18", "status": "To Do", "completedAt": null},
      {"id": "SUB-003-3", "title": "Draft incident response procedure", "assignee": "22222222-2222-2222-2222-222222222203", "dueDate": "2026-09-19", "status": "To Do", "completedAt": null},
      {"id": "SUB-003-4", "title": "Review and finalize document", "assignee": "ed08ee60-c54b-40f5-8273-34c5439eaa8b", "dueDate": "2026-09-20", "status": "To Do", "completedAt": null}
    ]'::jsonb
  ),
  (
    '88888888-8888-8888-8888-888888888804', 'TSK-2026-004', 'Server Room Cable Management',
    'Organize and label all server room cables. Install cable trays and proper cable management solutions.',
    'Low', 'Completed', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', '2026-09-08', '2026-09-01', 'Infrastructure Maintenance', 'IT Department',
    '["22222222-2222-2222-2222-222222222204"]'::jsonb,
    '[
      {"id": "SUB-004-1", "title": "Remove old unused cables", "assignee": "22222222-2222-2222-2222-222222222204", "dueDate": "2026-09-02", "status": "Completed", "completedAt": "2026-09-02T14:00:00Z"},
      {"id": "SUB-004-2", "title": "Install cable trays", "assignee": "22222222-2222-2222-2222-222222222204", "dueDate": "2026-09-05", "status": "Completed", "completedAt": "2026-09-05T16:00:00Z"},
      {"id": "SUB-004-3", "title": "Label and document all cables", "assignee": "22222222-2222-2222-2222-222222222204", "dueDate": "2026-09-08", "status": "Completed", "completedAt": "2026-09-08T12:00:00Z"}
    ]'::jsonb
  )
ON CONFLICT (task_number) DO NOTHING;

-- 12. ZOOM REQUESTS SEED
INSERT INTO itsm.zoom_requests (id, meeting_name, scheduled_time, status, requester_id, assignee_id, meeting_link, location, meeting_level, required_equipment)
VALUES
  (
    '99999999-9999-9999-9999-999999999901', 'Higher Education Budget Review 2027',
    '2026-09-18 09:00:00+05:30', 'Confirmed',
    '68783080-af72-4144-a3cc-2ab166fc0446', '22222222-2222-2222-2222-222222222202',
    'https://zoom.us/j/123456789', 'Main Conference Hall — 3rd Floor', 'Critical',
    '["Projector", "HDMI Cable", "Laptop", "Microphone", "Screen"]'::jsonb
  ),
  (
    '99999999-9999-9999-9999-999999999902', 'Academic Council Meeting',
    '2026-09-20 14:00:00+05:30', 'Pending',
    '68783080-af72-4144-a3cc-2ab166fc0446', '22222222-2222-2222-2222-222222222203',
    NULL, 'Boardroom — 5th Floor', 'Medium',
    '["Laptop", "HDMI Cable", "Webcam"]'::jsonb
  ),
  (
    '99999999-9999-9999-9999-999999999903', 'IT Infrastructure Planning Session',
    '2026-09-10 10:00:00+05:30', 'Completed',
    '68783080-af72-4144-a3cc-2ab166fc0446', 'cf9ee99c-d1dc-4805-8b25-69909a366d58',
    'https://zoom.us/j/111222333', 'IT Training Room — 1st Floor', 'Medium',
    '["Laptop", "Projector", "VGA Cable"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 13. PUBLICATIONS SEED
INSERT INTO itsm.publications (id, title, content, status, requested_by, approved_by, published_by, published_at, attachments)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Scholarship Application Portal Launch Notice',
    'Official notice regarding the opening of the 2027 Scholarship Applications portal...',
    'Published', '68783080-af72-4144-a3cc-2ab166fc0446', 'ed08ee60-c54b-40f5-8273-34c5439eaa8b',
    'cf9ee99c-d1dc-4805-8b25-69909a366d58', '2026-09-10 12:00:00+05:30',
    '["scholarship_notice_2027.pdf"]'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ministry Annual Report 2025 — Web Upload',
    'Annual report document for public portal...',
    'Pending Review', '68783080-af72-4144-a3cc-2ab166fc0446', NULL, NULL, NULL,
    '["annual_report_2025.pdf", "summary_2025.docx"]'::jsonb
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Updated Contact Directory',
    'Updated divisional contacts and phone directory...',
    'Published', '68783080-af72-4144-a3cc-2ab166fc0446', 'ed08ee60-c54b-40f5-8273-34c5439eaa8b',
    '22222222-2222-2222-2222-222222222201', '2026-09-05 11:00:00+05:30',
    '[]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 14. AUDIT LOGS SEED
INSERT INTO itsm.audit_logs (id, user_id, action, entity_type, entity_id, description, module, created_at)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddd0001', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', 'CREATE', 'Ticket', '66666666-6666-6666-6666-666666666604', 'Created new ticket: Printer offline — Canon iR 2630i', 'Helpdesk', '2026-09-16 08:30:15+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0002', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', 'ASSIGN', 'Ticket', '66666666-6666-6666-6666-666666666604', 'Assigned ticket TKT-2026-004 to Savishka', 'Helpdesk', '2026-09-16 08:35:22+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0003', 'ed08ee60-c54b-40f5-8273-34c5439eaa8b', 'CREATE', 'Task', '88888888-8888-8888-8888-888888888803', 'Created task: IT Security Policy Documentation', 'Task Management', '2026-09-15 14:22:10+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0004', '22222222-2222-2222-2222-222222222203', 'REASSIGN_REQUEST', 'Ticket', '66666666-6666-6666-6666-666666666603', 'Submitted reassignment request for TKT-2026-003 — Network issue beyond trainee skill level', 'Helpdesk', '2026-09-15 10:05:44+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0005', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', 'UPDATE', 'Stock', '55555555-5555-5555-5555-555555555511', 'Marked HDMI Cable stock as "Not Available" — quantity: 0', 'Stock', '2026-09-14 11:30:00+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0006', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', 'STATUS_CHANGE', 'Ticket', '66666666-6666-6666-6666-666666666601', 'Changed ticket status from Assigned → In Progress', 'Helpdesk', '2026-09-14 10:15:33+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0007', 'ed08ee60-c54b-40f5-8273-34c5439eaa8b', 'PRIVILEGE_CHANGE', 'User', '22222222-2222-2222-2222-222222222203', 'Increased privileges for Shalom — granted asset editing access', 'User Management', '2026-09-13 15:45:22+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0008', '22222222-2222-2222-2222-222222222202', 'RESOLVE', 'Ticket', '66666666-6666-6666-6666-666666666602', 'Marked ticket TKT-2026-002 as Resolved — Office license renewed', 'Helpdesk', '2026-09-13 14:30:00+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0009', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', 'DISPATCH', 'Repair', '77777777-7777-7777-7777-777777777701', 'Dispatched MOHE-PC-0003 to TechFix Maldives for motherboard repair', 'External Repairs', '2026-09-12 09:00:00+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0010', 'cf9ee99c-d1dc-4805-8b25-69909a366d58', 'PUBLISH', 'Publication', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Published: Scholarship Application Portal Launch Notice', 'Web Publication', '2026-09-10 12:00:00+05:30'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0011', 'ed08ee60-c54b-40f5-8273-34c5439eaa8b', 'LOGIN', 'Session', 'ed08ee60-c54b-40f5-8273-34c5439eaa8b', 'Super Admin logged in from 192.168.1.5', 'Authentication', '2026-09-08 10:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- 15. GRANT PERMISSIONS TO itsm_admin
GRANT ALL ON SCHEMA itsm TO itsm_admin;
GRANT ALL ON ALL TABLES IN SCHEMA itsm TO itsm_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA itsm TO itsm_admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA itsm TO itsm_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA itsm GRANT ALL ON TABLES TO itsm_admin;

-- Upgrade completed successfully.
