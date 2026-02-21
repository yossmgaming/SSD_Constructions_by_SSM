-- ============================================================
-- PART 4: BOQs, PAYMENTS, ADVANCES, OBLIGATIONS
-- ============================================================

-- ===================== BOQs =====================
INSERT INTO boqs (id, "projectId", title, "toAddress", notes, "documentDate") VALUES
(1, 1, 'Colombo Tower - Foundation & Structure', 'Perera Holdings\nNo 45, Galle Road\nColombo 03', 'Foundation and structural works estimate', '2025-10-20'),
(2, 2, 'Kandy Villa - Full Construction', 'Dr. Nimal Jayawardena\nNo 12, Peradeniya Rd\nKandy', 'Complete villa construction BOQ', '2025-12-28'),
(3, 3, 'Galle Hotel - Renovation Works', 'Lanka Heritage Hotels\nFort, Galle', 'Heritage restoration and modernization', '2025-12-10'),
(4, 4, 'Negombo Apartments - Phase 1 Substructure', 'Serendip Developers\nNegombo', 'Foundation and basement works', '2026-01-15'),
(5, 7, 'N.Eliya Bungalow - Complete', 'Mr. Priyantha Wijesinghe\nNuwara Eliya', 'Full bungalow construction', '2026-01-08');

-- ===================== BOQ ITEMS =====================
INSERT INTO "boqItems" (id, "boqId", "itemNo", description, quantity, unit, rate, amount) VALUES
-- BOQ 1: Colombo Tower Foundation
(1, 1, '1.1', 'Site Clearing & Excavation', 500, 'cubes', 3500, 1750000),
(2, 1, '1.2', 'Anti-termite Treatment', 2000, 'sqft', 25, 50000),
(3, 1, '1.3', 'Foundation Concrete (Grade 25)', 80, 'cubes', 28000, 2240000),
(4, 1, '1.4', 'TMT Steel Reinforcement 12mm', 3, 'ton', 285000, 855000),
(5, 1, '1.5', 'TMT Steel Reinforcement 16mm', 2, 'ton', 290000, 580000),
(6, 1, '1.6', 'Column Construction (up to 3rd floor)', 24, 'unit', 85000, 2040000),
(7, 1, '1.7', 'Slab Casting (4" RC Slab)', 4000, 'sqft', 350, 1400000),
(8, 1, '1.8', 'Beam Construction', 40, 'unit', 45000, 1800000),
(9, 1, '1.9', 'Formwork & Scaffolding', 1, 'lot', 650000, 650000),
(10, 1, '1.10', 'Binding Wire & Accessories', 50, 'kg', 450, 22500),
-- BOQ 2: Kandy Villa
(11, 2, '1.1', 'Site Clearing', 200, 'sqft', 15, 3000),
(12, 2, '1.2', 'Foundation Excavation', 30, 'cubes', 3500, 105000),
(13, 2, '1.3', 'Foundation Concrete', 15, 'cubes', 28000, 420000),
(14, 2, '1.4', 'Cement Block Wall (6")', 1800, 'sqft', 85, 153000),
(15, 2, '1.5', 'Internal Plastering', 3500, 'sqft', 45, 157500),
(16, 2, '1.6', 'External Plastering', 2000, 'sqft', 55, 110000),
(17, 2, '1.7', 'Floor Tiling (Ceramic)', 1500, 'sqft', 180, 270000),
(18, 2, '1.8', 'Wall Tiling (Bathrooms)', 400, 'sqft', 120, 48000),
(19, 2, '1.9', 'Plumbing (Complete)', 1, 'lot', 450000, 450000),
(20, 2, '1.10', 'Electrical Wiring (25 points)', 25, 'unit', 1500, 37500),
(21, 2, '1.11', 'Teak Door Frames (6)', 6, 'unit', 18000, 108000),
(22, 2, '1.12', 'Teak Window Frames (8)', 8, 'unit', 12000, 96000),
(23, 2, '1.13', 'Interior Painting (2 coats)', 3500, 'sqft', 35, 122500),
(24, 2, '1.14', 'Exterior Painting (2 coats)', 2000, 'sqft', 45, 90000),
(25, 2, '1.15', 'Swimming Pool Construction', 1, 'lot', 1200000, 1200000),
-- BOQ 3: Galle Hotel Renovation
(26, 3, '1.1', 'Demolition & Debris Removal', 1, 'lot', 350000, 350000),
(27, 3, '1.2', 'Heritage Wall Restoration', 800, 'sqft', 250, 200000),
(28, 3, '1.3', 'New Internal Walls (Block)', 600, 'sqft', 85, 51000),
(29, 3, '1.4', 'Heritage Timber Restoration', 1, 'lot', 800000, 800000),
(30, 3, '1.5', 'Modern Bathroom Installation (6)', 6, 'unit', 350000, 2100000),
(31, 3, '1.6', 'Complete Rewiring', 1, 'lot', 1200000, 1200000),
(32, 3, '1.7', 'Roof Restoration', 1500, 'sqft', 150, 225000),
(33, 3, '1.8', 'Interior Finishing & Paint', 4000, 'sqft', 55, 220000),
-- BOQ 5: N.Eliya Bungalow
(34, 5, '1.1', 'Site Preparation', 1, 'lot', 120000, 120000),
(35, 5, '1.2', 'Foundation (Strip)', 1, 'lot', 280000, 280000),
(36, 5, '1.3', 'Block Wall Construction', 1200, 'sqft', 85, 102000),
(37, 5, '1.4', 'Tudor-style Timber Framework', 1, 'lot', 650000, 650000),
(38, 5, '1.5', 'Amano Roof with Insulation', 800, 'sqft', 120, 96000),
(39, 5, '1.6', 'Plumbing & Heating', 1, 'lot', 380000, 380000),
(40, 5, '1.7', 'Electrical + Solar Panel', 1, 'lot', 520000, 520000);

-- ===================== PAYMENTS =====================
INSERT INTO payments (id, "projectId", date, category, notes, amount, method, status, reference, direction, "workerId", "supplierId", "materialId", quantity) VALUES
(1, 1, '2025-11-15', 'Material', 'Cement delivery - 100 bags', 235000, 'Bank', 'Paid', 'TXN-001', 'Out', NULL, 1, 1, 100),
(2, 1, '2025-11-20', 'Material', 'Steel bars 12mm - 3 tons', 855000, 'Bank', 'Paid', 'TXN-002', 'Out', NULL, 2, 2, 3),
(3, 1, '2025-12-01', 'Material', 'Steel bars 16mm - 2 tons', 580000, 'Bank', 'Paid', 'TXN-003', 'Out', NULL, 2, 4, 2),
(4, 1, '2025-12-05', 'Labour', 'Worker wages - Nov batch', 180000, 'Cash', 'Paid', NULL, 'Out', NULL, NULL, NULL, NULL),
(5, 1, '2026-01-15', 'Material', 'Cement blocks 6" - 200 nos', 17000, 'Cash', 'Paid', NULL, 'Out', NULL, NULL, 8, 200),
(6, 1, '2026-01-20', 'Labour', 'Worker wages - Dec/Jan', 350000, 'Bank', 'Paid', 'TXN-006', 'Out', NULL, NULL, NULL, NULL),
(7, 2, '2026-01-10', 'Material', 'Cement - 40 bags', 94000, 'Cash', 'Paid', NULL, 'Out', NULL, 1, 1, 40),
(8, 2, '2026-01-12', 'Material', 'River sand - 5 cubes', 160000, 'Bank', 'Paid', 'TXN-008', 'Out', NULL, 8, 5, 5),
(9, 2, '2026-02-10', 'Material', 'Teak wood 4x2', 72000, 'Bank', 'Paid', 'TXN-009', 'Out', NULL, 4, 10, 60),
(10, 3, '2026-01-05', 'Material', 'Teak for restoration', 48000, 'Bank', 'Paid', 'TXN-010', 'Out', NULL, 4, 10, 40),
(11, 3, '2026-02-15', 'Material', 'Heritage paint supplies', 29000, 'Cash', 'Paid', NULL, 'Out', NULL, 6, 14, 20),
(12, 4, '2026-01-25', 'Material', 'Cement - 80 bags', 188000, 'Bank', 'Paid', 'TXN-012', 'Out', NULL, 1, 1, 80),
(13, 4, '2026-01-25', 'Material', 'Sand & aggregate', 421000, 'Bank', 'Paid', 'TXN-013', 'Out', NULL, 8, NULL, NULL),
(14, 1, '2026-02-01', 'Income', 'Client payment - milestone 2', 5000000, 'Bank', 'Paid', 'RCV-001', 'In', NULL, NULL, NULL, NULL),
(15, 2, '2026-02-05', 'Income', 'Client payment - 2nd installment', 1500000, 'Cheque', 'Paid', 'CHQ-1234', 'In', NULL, NULL, NULL, NULL),
(16, 3, '2026-01-30', 'Income', 'Client payment', 3000000, 'Bank', 'Paid', 'RCV-003', 'In', NULL, NULL, NULL, NULL),
(17, 1, '2026-02-15', 'Labour', 'Feb first half wages', 420000, 'Bank', 'Paid', 'TXN-017', 'Out', NULL, NULL, NULL, NULL),
(18, 7, '2026-02-01', 'Material', 'Amano roofing sheets', 70000, 'Cash', 'Paid', NULL, 'Out', NULL, 3, 22, 25),
(19, 4, '2026-02-10', 'Income', 'Client advance payment', 3000000, 'Bank', 'Paid', 'RCV-004', 'In', NULL, NULL, NULL, NULL);

-- ===================== ADVANCES =====================
INSERT INTO advances (id, "workerId", "projectId", date, amount, notes, status) VALUES
(1, 1, 1, '2026-01-15', 10000, 'Personal emergency', 'Approved'),
(2, 4, 1, '2026-01-20', 5000, 'Medical expenses', 'Approved'),
(3, 2, 1, '2026-02-03', 8000, 'Family needs', 'Approved'),
(4, 7, 2, '2026-02-10', 15000, 'House repair', 'Approved'),
(5, 11, 3, '2026-02-05', 7000, 'School fees', 'Approved'),
(6, 14, 1, '2026-02-12', 3000, NULL, 'Approved'),
(7, 9, 1, '2026-02-18', 12000, 'Vehicle repair', 'Pending'),
(8, 16, 4, '2026-02-15', 8000, NULL, 'Approved');

-- ===================== ADVANCE APPLICATIONS =====================
INSERT INTO "advanceApplications" (id, "workerId", date, "amountRequested", reason, status, "approvedAmount") VALUES
(1, 1, '2026-01-14', 15000, 'Wife medical treatment at Kandy hospital', 'Approved', 10000),
(2, 4, '2026-01-19', 5000, 'Daughter school fees', 'Approved', 5000),
(3, 2, '2026-02-02', 10000, 'Family event expenses', 'Approved', 8000),
(4, 7, '2026-02-09', 15000, 'House repair after storm', 'Approved', 15000),
(5, 9, '2026-02-17', 12000, 'Three-wheeler repair', 'Pending', NULL),
(6, 10, '2026-02-20', 6000, 'Personal needs', 'Pending', NULL);

-- ===================== OBLIGATION HEADERS =====================
INSERT INTO "obligationHeaders" (id, type, direction, "entityType", "entityId", "clientName", "supplierId", "projectId", "totalAmountSnapshot", "dueDate", status, notes) VALUES
(1, 'ClientInvoice', 'Receivable', 'Client', NULL, 'Perera Holdings (Pvt) Ltd', NULL, 1, 12000000, '2026-03-15', 'Partial', 'Milestone 1-3 invoice'),
(2, 'ClientInvoice', 'Receivable', 'Client', NULL, 'Dr. Nimal Jayawardena', NULL, 2, 4500000, '2026-02-28', 'Partial', 'First phase completion'),
(3, 'MaterialPurchase', 'Payable', 'Supplier', 2, NULL, 2, 1, 1435000, '2026-01-30', 'Paid', 'Steel delivery - Nov/Dec'),
(4, 'MaterialPurchase', 'Payable', 'Supplier', 1, NULL, 1, 1, 235000, '2025-12-15', 'Paid', 'Cement Nov batch'),
(5, 'ClientInvoice', 'Receivable', 'Client', NULL, 'Lanka Heritage Hotels', NULL, 3, 7000000, '2026-03-01', 'Partial', 'Restoration phase 1'),
(6, 'MaterialPurchase', 'Payable', 'Supplier', 8, NULL, 8, 4, 421000, '2026-02-25', 'Pending', 'Sand & aggregate delivery'),
(7, 'ProjectExpense', 'Payable', 'None', NULL, NULL, NULL, 1, 950000, '2026-02-28', 'Pending', 'Feb labour costs');

-- ===================== OBLIGATION LINES =====================
INSERT INTO "obligationLines" (id, "headerId", "materialId", description, quantity, "unitPrice", "lineTotal") VALUES
(1, 1, NULL, 'Foundation works completion', 1, 5000000, 5000000),
(2, 1, NULL, 'Structural frame (floors 1-3)', 1, 4000000, 4000000),
(3, 1, NULL, 'Slab casting (floors 1-3)', 1, 3000000, 3000000),
(4, 2, NULL, 'Foundation & walls', 1, 2500000, 2500000),
(5, 2, NULL, 'Plumbing rough-in', 1, 500000, 500000),
(6, 2, NULL, 'Electrical rough-in', 1, 1500000, 1500000),
(7, 3, 2, 'TMT 12mm - 3 tons', 3, 285000, 855000),
(8, 3, 4, 'TMT 16mm - 2 tons', 2, 290000, 580000),
(9, 4, 1, 'OPC Cement - 100 bags', 100, 2350, 235000),
(10, 5, NULL, 'Demolition & restoration phase 1', 1, 3500000, 3500000),
(11, 5, NULL, 'Heritage timber work', 1, 3500000, 3500000),
(12, 6, 5, 'River sand - 8 cubes', 8, 32000, 256000),
(13, 6, 6, 'Aggregate 3/4" - 10 cubes', 10, 16500, 165000);

-- ===================== CASH SETTLEMENTS =====================
INSERT INTO "cashSettlements" (id, "obligationHeaderId", date, amount, direction, method, reference) VALUES
(1, 1, '2026-01-15', 5000000, 'In', 'Bank', 'RCV-M1'),
(2, 1, '2026-02-01', 5000000, 'In', 'Bank', 'RCV-M2'),
(3, 2, '2026-01-20', 1700000, 'In', 'Bank', 'KV-001'),
(4, 2, '2026-02-05', 1500000, 'In', 'Cheque', 'CHQ-1234'),
(5, 3, '2025-11-25', 855000, 'Out', 'Bank', 'PAY-STL1'),
(6, 3, '2025-12-10', 580000, 'Out', 'Bank', 'PAY-STL2'),
(7, 4, '2025-11-20', 235000, 'Out', 'Bank', 'PAY-CMT1'),
(8, 5, '2026-01-30', 3000000, 'In', 'Bank', 'RCV-GH1');

-- ===================== PAYMENT HEADERS (must come before settlements) =====================
INSERT INTO "paymentHeaders" (id, "workerId", "periodStart", "periodEnd", "totalEarned", "totalAdvance", "netPayable", "paidAmount", status) VALUES
(1, 1, '2026-02-01', '2026-02-15', 63000, 10000, 53000, 53000, 'Paid'),
(2, 2, '2026-02-01', '2026-02-15', 52000, 8000, 44000, 44000, 'Paid'),
(3, 3, '2026-02-01', '2026-02-15', 78000, 0, 78000, 78000, 'Paid'),
(4, 4, '2026-02-01', '2026-02-15', 20000, 5000, 15000, 15000, 'Paid'),
(5, 5, '2026-02-01', '2026-02-15', 47500, 0, 47500, 0, 'Pending'),
(6, 12, '2026-02-01', '2026-02-15', 104000, 0, 104000, 104000, 'Paid');

-- ===================== SETTLEMENTS (headerId → paymentHeaders.id) =====================
INSERT INTO settlements (id, "headerId", date, amount, method, reference) VALUES
(1, 1, '2026-02-15', 53000, 'Bank', 'PAY-W1-FEB'),
(2, 2, '2026-02-15', 44000, 'Bank', 'PAY-W2-FEB'),
(3, 3, '2026-02-15', 78000, 'Bank', 'PAY-W3-FEB'),
(4, 4, '2026-02-15', 15000, 'Cash', 'PAY-W4-FEB'),
(5, 6, '2026-02-15', 104000, 'Bank', 'PAY-W12-FEB');

-- ===================== PAYMENT LINES =====================
INSERT INTO "paymentLines" (id, "headerId", date, "projectId", "hoursWorked", rate, "lineTotal") VALUES
(1, 1, '2026-02-03', 1, 8, 562.50, 4500),
(2, 1, '2026-02-04', 1, 8, 562.50, 4500),
(3, 1, '2026-02-05', 1, 8, 562.50, 4500),
(4, 1, '2026-02-06', 1, 8, 562.50, 4500),
(5, 1, '2026-02-07', 1, 8, 562.50, 4500),
(6, 1, '2026-02-10', 1, 8, 562.50, 4500),
(7, 1, '2026-02-11', 1, 8, 562.50, 4500),
(8, 1, '2026-02-12', 1, 8, 562.50, 4500),
(9, 1, '2026-02-13', 1, 8, 562.50, 4500),
(10, 1, '2026-02-14', 1, 0, 562.50, 0),
(11, 2, '2026-02-03', 1, 8, 500, 4000),
(12, 2, '2026-02-04', 1, 8, 500, 4000),
(13, 2, '2026-02-05', 1, 8, 500, 4000),
(14, 2, '2026-02-06', 1, 4, 500, 2000),
(15, 2, '2026-02-07', 1, 8, 500, 4000),
(16, 2, '2026-02-10', 1, 8, 500, 4000),
(17, 2, '2026-02-11', 1, 8, 500, 4000),
(18, 2, '2026-02-12', 1, 8, 500, 4000),
(19, 2, '2026-02-13', 1, 8, 500, 4000),
(20, 2, '2026-02-14', 1, 8, 500, 4000);

-- ============================================================
-- Reset sequences to continue from highest ID
-- ============================================================
SELECT setval(pg_get_serial_sequence('"projects"', 'id'), (SELECT MAX(id) FROM projects));
SELECT setval(pg_get_serial_sequence('"workers"', 'id'), (SELECT MAX(id) FROM workers));
SELECT setval(pg_get_serial_sequence('"materials"', 'id'), (SELECT MAX(id) FROM materials));
SELECT setval(pg_get_serial_sequence('"suppliers"', 'id'), (SELECT MAX(id) FROM suppliers));
SELECT setval(pg_get_serial_sequence('"workerRates"', 'id'), (SELECT MAX(id) FROM "workerRates"));
SELECT setval(pg_get_serial_sequence('"workRates"', 'id'), (SELECT MAX(id) FROM "workRates"));
SELECT setval(pg_get_serial_sequence('"projectWorkers"', 'id'), (SELECT MAX(id) FROM "projectWorkers"));
SELECT setval(pg_get_serial_sequence('"projectMaterials"', 'id'), (SELECT MAX(id) FROM "projectMaterials"));
SELECT setval(pg_get_serial_sequence('"bankAccounts"', 'id'), (SELECT MAX(id) FROM "bankAccounts"));
SELECT setval(pg_get_serial_sequence('"attendances"', 'id'), (SELECT MAX(id) FROM attendances));
SELECT setval(pg_get_serial_sequence('"boqs"', 'id'), (SELECT MAX(id) FROM boqs));
SELECT setval(pg_get_serial_sequence('"boqItems"', 'id'), (SELECT MAX(id) FROM "boqItems"));
SELECT setval(pg_get_serial_sequence('"payments"', 'id'), (SELECT MAX(id) FROM payments));
SELECT setval(pg_get_serial_sequence('"advances"', 'id'), (SELECT MAX(id) FROM advances));
SELECT setval(pg_get_serial_sequence('"advanceApplications"', 'id'), (SELECT MAX(id) FROM "advanceApplications"));
SELECT setval(pg_get_serial_sequence('"obligationHeaders"', 'id'), (SELECT MAX(id) FROM "obligationHeaders"));
SELECT setval(pg_get_serial_sequence('"obligationLines"', 'id'), (SELECT MAX(id) FROM "obligationLines"));
SELECT setval(pg_get_serial_sequence('"cashSettlements"', 'id'), (SELECT MAX(id) FROM "cashSettlements"));
SELECT setval(pg_get_serial_sequence('"settlements"', 'id'), (SELECT MAX(id) FROM settlements));
SELECT setval(pg_get_serial_sequence('"paymentHeaders"', 'id'), (SELECT MAX(id) FROM "paymentHeaders"));
SELECT setval(pg_get_serial_sequence('"paymentLines"', 'id'), (SELECT MAX(id) FROM "paymentLines"));
