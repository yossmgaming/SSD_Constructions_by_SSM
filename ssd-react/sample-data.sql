-- ============================================================
-- SSD CONSTRUCTIONS - SAMPLE DATA (Sri Lankan)
-- Run AFTER the TRUNCATE command
-- ============================================================

-- ===================== PROJECTS =====================
INSERT INTO projects (id, name, status, "startDate", "endDate", budget, amount, received, remaining, client, "clientContact", "clientPhone", location, "contractValue", "projectType", progress, description, notes) VALUES
(1, 'Colombo City Tower', 'Ongoing', '2025-11-01', '2026-08-30', 45000000, 45000000, 18000000, 27000000, 'Perera Holdings (Pvt) Ltd', 'Mahinda Perera', '0771234567', 'Colombo 03', 52000000, 'Commercial', 35, '12-storey mixed-use tower in Colombo 03', 'Phase 1 foundation complete'),
(2, 'Kandy Villa Residence', 'Ongoing', '2026-01-05', '2026-06-30', 8500000, 8500000, 3200000, 5300000, 'Dr. Nimal Jayawardena', 'Dr. Nimal Jayawardena', '0772345678', 'Katugastota, Kandy', 9200000, 'Residential', 40, 'Luxury 4-bedroom villa with pool', 'Client wants Italian marble flooring'),
(3, 'Galle Heritage Hotel Renovation', 'Ongoing', '2025-12-15', '2026-05-15', 12000000, 12000000, 6500000, 5500000, 'Lanka Heritage Hotels', 'Chaminda Silva', '0773456789', 'Galle Fort', 14500000, 'Renovation', 55, 'Colonial-era hotel restoration and modernization', 'Heritage authority approval obtained'),
(4, 'Negombo Beach Apartments', 'Ongoing', '2026-01-20', '2026-12-31', 32000000, 32000000, 8000000, 24000000, 'Serendip Developers', 'Ruwan Fernando', '0774567890', 'Negombo Beach Road', 38000000, 'Residential', 20, '24-unit beachfront apartment complex', 'Coastal zone permit approved'),
(5, 'Matara School Extension', 'Completed', '2025-08-01', '2026-01-15', 6000000, 6000000, 6000000, 0, 'Ministry of Education - Southern', 'D.M. Karunaratne', '0775678901', 'Matara Town', 6200000, 'Commercial', 100, 'New science lab building and library wing', 'Handed over Jan 15'),
(6, 'Kurunegala Warehouse', 'On Hold', '2026-02-01', '2026-07-30', 15000000, 15000000, 2000000, 13000000, 'Sampath Distributors', 'Ajith Bandara', '0776789012', 'Kurunegala Industrial Zone', 16500000, 'Industrial', 10, '5000 sqft warehouse with cold storage', 'On hold - waiting for steel prices to stabilize'),
(7, 'Nuwara Eliya Bungalow', 'Ongoing', '2026-01-10', '2026-04-30', 5500000, 5500000, 2800000, 2700000, 'Priyantha Wijesinghe', 'Priyantha Wijesinghe', '0777890123', 'Nuwara Eliya', 6000000, 'Residential', 50, 'Tudor-style holiday bungalow', 'Special roofing for hill country weather'),
(8, 'Anuradhapura Community Center', 'Ongoing', '2026-02-01', '2026-09-30', 9000000, 9000000, 1500000, 7500000, 'Anuradhapura UC', 'S. Ratnayake', '0778901234', 'Anuradhapura', 9800000, 'Infrastructure', 12, 'Multi-purpose community hall with auditorium', 'Government co-funded project');

-- ===================== WORKERS =====================
INSERT INTO workers (id, "fullName", role, "dailyRate", "hourlyRate", "otRate", "weeklyAllowance", phone, phone2, nic, address, "baseWeekly", status, notes) VALUES
(1, 'Kumara Bandara', 'Mason', 4500, 562.50, 750, 500, '0711111111', NULL, '198512345V', 'No 12, Gampaha Rd, Kadawatha', 27000, 'Active', 'Senior mason, 15 years experience'),
(2, 'Saman Wickramasinghe', 'Mason', 4000, 500, 700, 500, '0712222222', '0762222222', '199023456V', 'No 45, Temple Rd, Kelaniya', 24000, 'Active', NULL),
(3, 'Nimal Perera', 'Supervisor', 6000, 750, 1000, 1000, '0713333333', NULL, '198534567V', 'No 78, Main St, Maharagama', 36000, 'Active', 'Site supervisor - Colombo projects'),
(4, 'Kamal Dissanayake', 'Helper', 2500, 312.50, 450, 300, '0714444444', NULL, '199545678V', '23/A, Kandy Rd, Kadugannawa', 15000, 'Active', NULL),
(5, 'Sunil Fernando', 'Electrician', 5000, 625, 850, 500, '0715555555', NULL, '198856789V', 'No 56, Lake Rd, Kurunegala', 30000, 'Active', 'Licensed electrician - SLEA certified'),
(6, 'Ajith Kumara', 'Plumber', 4500, 562.50, 750, 500, '0716666666', NULL, '199267890V', '12/B, Peradeniya Rd, Kandy', 27000, 'Active', NULL),
(7, 'Roshan de Silva', 'Carpenter', 4500, 562.50, 750, 500, '0717777777', '0767777777', '198778901V', 'No 34, Galle Rd, Panadura', 27000, 'Active', 'Specializes in woodwork finishing'),
(8, 'Priyantha Jayasinghe', 'Painter', 3500, 437.50, 600, 400, '0718888888', NULL, '199389012V', '67, Negombo Rd, Ja-Ela', 21000, 'Active', NULL),
(9, 'Chaminda Ratnayake', 'Welder', 5000, 625, 850, 500, '0719999999', NULL, '198690123V', 'No 89, Baseline Rd, Borella', 30000, 'Active', 'Arc and MIG welding'),
(10, 'Lalith Gunasekara', 'Helper', 2500, 312.50, 450, 300, '0720000001', NULL, '199801234V', '45/C, Malabe Rd, Kaduwela', 15000, 'Active', NULL),
(11, 'Dinesh Amarasinghe', 'Mason', 4200, 525, 720, 500, '0720000002', NULL, '199112345V', '22, Colombo Rd, Gampaha', 25200, 'Active', NULL),
(12, 'Tharanga Herath', 'Site Engineer', 8000, 1000, 1200, 1500, '0720000003', NULL, '199223456V', 'No 15, Kandy Rd, Peradeniya', 48000, 'Active', 'BSc Civil Engineering - Moratuwa'),
(13, 'Sandun Weerasinghe', 'Driver', 3500, 437.50, 600, 500, '0720000004', NULL, '198934567V', '78, Matara Rd, Galle', 21000, 'Active', 'Heavy vehicle license'),
(14, 'Nuwan Pradeep', 'Helper', 2500, 312.50, 450, 300, '0720000005', NULL, '200045678V', '33/A, Colombo Rd, Piliyandala', 15000, 'Active', NULL),
(15, 'Ranjith Senanayake', 'Foreman', 5500, 687.50, 900, 800, '0720000006', NULL, '198245678V', 'No 90, Galle Face, Colombo 03', 33000, 'Active', '20+ years in construction'),
(16, 'Mahesh Abeysekara', 'Operator', 5000, 625, 850, 500, '0720000007', NULL, '199456789V', '12, Negombo Rd, Wattala', 30000, 'Active', 'Backhoe and excavator operator'),
(17, 'Asanka de Alwis', 'Mason', 3800, 475, 650, 400, '0720000008', NULL, '199667890V', '56/B, High Level Rd, Nugegoda', 22800, 'Inactive', 'Temporarily unavailable'),
(18, 'Chathura Liyanage', 'Helper', 2500, 312.50, 450, 300, '0720000009', NULL, '200178901V', '90, Temple Rd, Dehiwala', 15000, 'Active', NULL);

-- ===================== SUPPLIERS =====================
INSERT INTO suppliers (id, name, contact, email, address, notes, "isActive", category, "bankDetails") VALUES
(1, 'Lanka Cement Industries', '0112345678', 'sales@lankacement.lk', 'No 45, Industrial Zone, Kelaniya', 'Main cement supplier - delivery within 24hrs', true, 'Cement', 'BOC - 7823456'),
(2, 'Perera Steel Traders', '0112456789', 'orders@pererasteel.lk', '12, Baseline Rd, Dematagoda', 'Best prices for TMT bars', true, 'Steel', 'Sampath - 1045678'),
(3, 'Island Hardware & Tools', '0113456789', 'info@islandhw.lk', '78, Kandy Rd, Kadawatha', 'Full range hardware', true, 'Hardware', 'HNB - 234567890'),
(4, 'Southern Timber Mills', '0914567890', 'timber@southern.lk', 'Galle Rd, Hikkaduwa', 'Teak and mahogany specialist', true, 'Timber', 'Peoples Bank - 3456789'),
(5, 'CeylonTiles (Pvt) Ltd', '0115678901', 'info@ceylontiles.lk', '23, Dutugemunu St, Colombo 06', 'Premium local and imported tiles', true, 'Tiles', 'Commercial Bank - 456789'),
(6, 'Nippon Paint Lanka', '0116789012', 'dealer@nipponpaint.lk', 'Peliyagoda Industrial Estate', 'Authorized dealer - bulk discounts available', true, 'Paint', 'NSB - 5678901'),
(7, 'Kelani Cables PLC', '0117890123', 'sales@kelanicables.lk', 'Kelaniya', 'Electrical cables and wiring', true, 'Electrical', 'Seylan - 6789012'),
(8, 'Mahaweli Sand & Aggregate', '0668901234', NULL, 'Mahaweli River zone, Polgolla', 'River sand and granite aggregate', true, 'Aggregate', NULL);

-- ===================== MATERIALS =====================
INSERT INTO materials (id, name, category, unit, cost, quantity, "minStock", "supplierId", description, notes) VALUES
(1, 'Ordinary Portland Cement (OPC)', 'Cement', 'Bags', 2350, 200, 50, 1, '50kg bag - Grade 43', 'Store in dry area'),
(2, 'TMT Steel Bar 12mm', 'Steel', 'ton', 285000, 5, 2, 2, '12mm Fe500 TMT reinforcement bar', NULL),
(3, 'TMT Steel Bar 10mm', 'Steel', 'ton', 278000, 3, 1, 2, '10mm Fe500 TMT', NULL),
(4, 'TMT Steel Bar 16mm', 'Steel', 'ton', 290000, 4, 2, 2, '16mm Fe500 TMT', NULL),
(5, 'River Sand', 'Sand', 'cubes', 32000, 15, 5, 8, 'Washed river sand', 'Check moisture content'),
(6, 'Metal 3/4" Aggregate', 'Aggregate', 'cubes', 16500, 20, 5, 8, 'Crushed granite 3/4 inch', NULL),
(7, 'Metal 1" Aggregate', 'Aggregate', 'cubes', 15000, 10, 3, 8, 'Crushed granite 1 inch', NULL),
(8, 'Cement Blocks 6"', 'Masonry', 'Pieces', 85, 500, 200, NULL, '6 inch solid cement block', NULL),
(9, 'Cement Blocks 4"', 'Masonry', 'Pieces', 55, 300, 100, NULL, '4 inch partition block', NULL),
(10, 'Teak Wood 4x2', 'Timber', 'ft', 1200, 100, 30, 4, '4x2 inch teak plank', 'Kiln dried'),
(11, 'Plywood 8x4 (12mm)', 'Timber', 'Sheets', 4800, 25, 10, 4, '12mm marine plywood', NULL),
(12, 'Floor Tiles 2x2 (Ceramic)', 'Tiles', 'sqft', 180, 400, 100, 5, '2x2 ft ceramic floor tiles', 'Anti-slip variety'),
(13, 'Wall Tiles 1x1 (Glossy)', 'Tiles', 'sqft', 120, 200, 50, 5, '1x1 ft glossy wall tiles', NULL),
(14, 'Nippon Weatherbond Paint', 'Paint', 'liter', 1450, 60, 20, 6, 'Exterior weatherproof paint', 'White and custom tints'),
(15, 'Nippon Vinilex Paint', 'Paint', 'liter', 850, 40, 15, 6, 'Interior emulsion paint', NULL),
(16, 'PVC Pipe 3" (Class D)', 'Plumbing', 'Meters', 380, 50, 15, 3, '3 inch PVC drain pipe', NULL),
(17, 'PVC Pipe 1/2" (Class E)', 'Plumbing', 'Meters', 120, 80, 20, 3, '1/2 inch PVC water supply', NULL),
(18, 'Electrical Cable 2.5mm Twin', 'Electrical', 'Meters', 95, 300, 50, 7, '2.5mm twin and earth cable', NULL),
(19, 'Electrical Cable 1.5mm Twin', 'Electrical', 'Meters', 65, 200, 50, 7, '1.5mm twin and earth cable', NULL),
(20, 'Binding Wire', 'Steel', 'kg', 450, 30, 10, 2, 'GI binding wire for reinforcement', NULL),
(21, 'Waterproofing Membrane', 'Waterproofing', 'Rolls', 8500, 8, 3, 3, 'SBS modified bitumen membrane', 'For flat roof waterproofing'),
(22, 'Roofing Sheets (Amano)', 'Roofing', 'Sheets', 2800, 50, 20, 3, '10ft amano roofing sheet', 'Galvanized'),
(23, 'Sand Cement Mixture', 'Concrete', 'Bags', 650, 100, 30, 1, 'Pre-mixed sand cement mortar', NULL),
(24, 'GI Nails 3"', 'Hardware', 'kg', 550, 20, 5, 3, '3 inch galvanized iron nails', NULL),
(25, 'Wood Screws Assorted', 'Hardware', 'Pieces', 5, 500, 100, 3, 'Assorted wood screws box', NULL);
