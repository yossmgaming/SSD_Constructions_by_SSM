-- ============================================================
-- PART 2: RELATIONAL DATA
-- ============================================================

-- ===================== WORKER RATES =====================
INSERT INTO "workerRates" (id, role, "hourlyRate", "dailyRate", "overtimeRate") VALUES
(1, 'Mason', 525, 4200, 720),
(2, 'Helper', 312.50, 2500, 450),
(3, 'Supervisor', 750, 6000, 1000),
(4, 'Electrician', 625, 5000, 850),
(5, 'Plumber', 562.50, 4500, 750),
(6, 'Carpenter', 562.50, 4500, 750),
(7, 'Painter', 437.50, 3500, 600),
(8, 'Welder', 625, 5000, 850),
(9, 'Site Engineer', 1000, 8000, 1200),
(10, 'Driver', 437.50, 3500, 600),
(11, 'Foreman', 687.50, 5500, 900),
(12, 'Operator', 625, 5000, 850);

-- ===================== WORK RATES =====================
INSERT INTO "workRates" (id, category, name, unit, "ratePerUnit", description) VALUES
(1, 'Masonry', 'Brick Wall (9")', 'sqft', 120, 'Standard 9-inch brick wall construction'),
(2, 'Masonry', 'Block Wall (6")', 'sqft', 85, '6-inch cement block wall'),
(3, 'Masonry', 'Plastering (Internal)', 'sqft', 45, 'Internal wall plastering with sand cement'),
(4, 'Masonry', 'Plastering (External)', 'sqft', 55, 'External wall plastering'),
(5, 'Concrete', 'Grade 25 Concrete', 'cubes', 28000, 'Structural concrete mix'),
(6, 'Concrete', 'Grade 20 Concrete', 'cubes', 24000, 'General purpose concrete'),
(7, 'Concrete', 'Slab Casting (4")', 'sqft', 350, '4-inch reinforced concrete slab'),
(8, 'Tiling', 'Floor Tiling (Ceramic)', 'sqft', 150, 'Ceramic tile laying with adhesive'),
(9, 'Tiling', 'Wall Tiling', 'sqft', 130, 'Wall tile fixing'),
(10, 'Painting', 'Interior Paint (2 coats)', 'sqft', 35, 'Emulsion paint 2 coats with primer'),
(11, 'Painting', 'Exterior Paint (2 coats)', 'sqft', 45, 'Weatherproof paint 2 coats'),
(12, 'Plumbing', 'PVC Pipe Installation', 'Meters', 250, 'PVC pipe laying and jointing'),
(13, 'Electrical', 'Wiring Point', 'unit', 1500, 'Single electrical point wiring'),
(14, 'Electrical', 'DB Board Installation', 'unit', 8500, 'Distribution board installation'),
(15, 'Roofing', 'Amano Sheet Roofing', 'sqft', 85, 'Amano sheet fixing with purlins'),
(16, 'Waterproofing', 'Membrane Waterproofing', 'sqft', 180, 'Bitumen membrane waterproofing'),
(17, 'Earthwork', 'Excavation (Manual)', 'cubes', 3500, 'Manual earth excavation'),
(18, 'Earthwork', 'Backfilling', 'cubes', 2000, 'Earth backfilling and compaction'),
(19, 'Carpentry', 'Door Frame (Teak)', 'unit', 18000, 'Teak door frame installation'),
(20, 'Carpentry', 'Window Frame (Teak)', 'unit', 12000, 'Teak window frame installation');

-- ===================== PROJECT WORKERS =====================
INSERT INTO "projectWorkers" (id, "projectId", "workerId", "assignedFrom", "assignedTo", role, notes) VALUES
(1, 1, 1, '2025-11-01', '2026-08-30', 'Mason', 'Lead mason for tower project'),
(2, 1, 2, '2025-11-15', '2026-08-30', 'Mason', NULL),
(3, 1, 3, '2025-11-01', '2026-08-30', 'Supervisor', 'Overall site supervision'),
(4, 1, 4, '2025-12-01', '2026-08-30', 'Helper', NULL),
(5, 1, 5, '2026-02-01', '2026-06-30', 'Electrician', 'Phase 2 electrical work'),
(6, 1, 9, '2026-01-15', '2026-04-30', 'Welder', 'Structural steel welding'),
(7, 1, 12, '2025-11-01', '2026-08-30', 'Site Engineer', NULL),
(8, 1, 15, '2025-11-01', '2026-08-30', 'Foreman', NULL),
(9, 1, 14, '2026-01-01', '2026-08-30', 'Helper', NULL),
(10, 2, 1, '2026-01-05', '2026-03-15', 'Mason', 'Villa masonry - weekends'),
(11, 2, 6, '2026-01-10', '2026-04-30', 'Plumber', NULL),
(12, 2, 7, '2026-02-01', '2026-06-30', 'Carpenter', 'Custom woodwork'),
(13, 2, 8, '2026-03-01', '2026-06-30', 'Painter', NULL),
(14, 2, 10, '2026-01-05', '2026-06-30', 'Helper', NULL),
(15, 3, 11, '2025-12-15', '2026-05-15', 'Mason', NULL),
(16, 3, 7, '2026-01-01', '2026-05-15', 'Carpenter', 'Heritage restoration woodwork'),
(17, 3, 8, '2026-02-01', '2026-05-15', 'Painter', NULL),
(18, 3, 15, '2025-12-15', '2026-05-15', 'Foreman', NULL),
(19, 4, 2, '2026-01-20', '2026-12-31', 'Mason', NULL),
(20, 4, 11, '2026-02-01', '2026-12-31', 'Mason', NULL),
(21, 4, 16, '2026-01-20', '2026-12-31', 'Operator', 'Excavation and piling'),
(22, 4, 13, '2026-01-20', '2026-12-31', 'Driver', 'Material transport'),
(23, 4, 14, '2026-02-01', '2026-12-31', 'Helper', NULL),
(24, 7, 6, '2026-01-10', '2026-04-30', 'Plumber', NULL),
(25, 7, 11, '2026-01-10', '2026-04-30', 'Mason', NULL),
(26, 8, 4, '2026-02-15', '2026-09-30', 'Helper', NULL),
(27, 8, 10, '2026-02-15', '2026-09-30', 'Helper', NULL);

-- ===================== PROJECT MATERIALS =====================
INSERT INTO "projectMaterials" (id, "projectId", "materialId", quantity, date, notes) VALUES
(1, 1, 1, 100, '2025-11-10', 'Foundation phase cement'),
(2, 1, 2, 3, '2025-11-15', 'Foundation reinforcement'),
(3, 1, 4, 2, '2025-12-01', 'Column reinforcement'),
(4, 1, 5, 10, '2025-11-10', 'Foundation backfill'),
(5, 1, 6, 8, '2025-11-12', 'Foundation concrete aggregate'),
(6, 1, 8, 200, '2026-01-15', 'Ground floor walls'),
(7, 1, 20, 15, '2025-11-20', 'Rebar tying'),
(8, 2, 1, 40, '2026-01-10', 'Villa foundation'),
(9, 2, 5, 5, '2026-01-12', NULL),
(10, 2, 8, 150, '2026-01-20', 'Boundary and internal walls'),
(11, 2, 10, 60, '2026-02-10', 'Door and window frames'),
(12, 2, 12, 150, '2026-03-01', 'Living room and bedroom floors'),
(13, 3, 10, 40, '2026-01-05', 'Heritage door restoration'),
(14, 3, 14, 20, '2026-02-15', 'Exterior heritage colours'),
(15, 3, 15, 15, '2026-02-15', 'Interior rooms'),
(16, 4, 1, 80, '2026-01-25', 'Foundation work'),
(17, 4, 2, 2, '2026-01-28', NULL),
(18, 4, 5, 8, '2026-01-25', NULL),
(19, 4, 6, 10, '2026-01-25', NULL),
(20, 7, 1, 30, '2026-01-15', NULL),
(21, 7, 22, 25, '2026-02-01', 'Amano roofing sheets for bungalow'),
(22, 7, 16, 30, '2026-01-20', 'Plumbing installation');

-- ===================== BANK ACCOUNTS =====================
INSERT INTO "bankAccounts" (id, "entityType", "entityId", name, "accName", "accNo", bank, branch) VALUES
(1, 'worker', '1', 'Kumara Bandara Savings', 'W.K. Bandara', '78912345', 'Bank of Ceylon', 'Kadawatha'),
(2, 'worker', '3', 'Nimal Perera Current', 'N.P. Perera', '10234567', 'Sampath Bank', 'Maharagama'),
(3, 'worker', '5', 'Sunil Fernando', 'S.M. Fernando', '45678901', 'HNB', 'Kurunegala'),
(4, 'worker', '12', 'Tharanga Herath', 'T.H. Herath', '89012345', 'Commercial Bank', 'Peradeniya'),
(5, 'supplier', '1', 'Lanka Cement Industries', 'Lanka Cement Industries (Pvt) Ltd', '7823456', 'BOC', 'Kelaniya'),
(6, 'supplier', '2', 'Perera Steel', 'Perera Steel Traders', '1045678', 'Sampath Bank', 'Dematagoda'),
(7, 'company', '0', 'SSD Constructions Main', 'SSD Constructions', '99887766', 'Commercial Bank', 'Colombo Fort');
