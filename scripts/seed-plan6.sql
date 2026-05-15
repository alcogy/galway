-- =======================================================================
-- Supplemental seed data for Plan 6 new features
-- Run with: bun run db:seed-plan6:local
--
-- Requires existing seed.sql to be applied first (prd-*, sup-*, acc-* IDs)
-- =======================================================================

-- -----------------------------------------------
-- 商品カテゴリ (Product Categories)
-- -----------------------------------------------
INSERT INTO product_categories (id, name, description, created_at) VALUES
  ('cat-1', '金属材料',   '鉄・アルミ・ステンレス等の金属素材',       '2026-01-10T09:00:00.000Z'),
  ('cat-2', '電子部品',   '基板・テープ・電子関連部品',               '2026-01-10T09:00:00.000Z'),
  ('cat-3', '樹脂・ゴム', 'プラスチックケース・ゴムパッキン等',       '2026-01-10T09:00:00.000Z'),
  ('cat-4', '機械部品',   'ベアリング・パイプ等の機械用部品',         '2026-01-10T09:00:00.000Z'),
  ('cat-5', '消耗品',     '防錆スプレー等の消耗品',                   '2026-01-10T09:00:00.000Z');

-- -----------------------------------------------
-- 商品カテゴリ & 最低在庫数 の更新
-- -----------------------------------------------
-- 金属材料
UPDATE products SET category_id = 'cat-1', min_quantity = 30  WHERE id = 'prd-1';   -- アルミフレーム  在庫48 → OK
UPDATE products SET category_id = 'cat-1', min_quantity = 500 WHERE id = 'prd-2';   -- ステンレスボルト 在庫1240 → OK
UPDATE products SET category_id = 'cat-1', min_quantity = 100 WHERE id = 'prd-3';   -- 鉄板  在庫320 → OK
UPDATE products SET category_id = 'cat-4', min_quantity = 100 WHERE id = 'prd-4';   -- 銅パイプ  在庫75 → ALERT
UPDATE products SET category_id = 'cat-3'                     WHERE id = 'prd-5';   -- プラスチックケース (no threshold)
UPDATE products SET category_id = 'cat-2', min_quantity = 50  WHERE id = 'prd-6';   -- 電子基板  在庫30 → ALERT
UPDATE products SET category_id = 'cat-3', min_quantity = 200 WHERE id = 'prd-7';   -- ゴムパッキン  在庫560 → OK
UPDATE products SET category_id = 'cat-5', min_quantity = 50  WHERE id = 'prd-8';   -- 防錆スプレー  在庫42 → ALERT
UPDATE products SET category_id = 'cat-4', min_quantity = 30  WHERE id = 'prd-9';   -- ベアリング  在庫88 → OK
UPDATE products SET category_id = 'cat-2'                     WHERE id = 'prd-10';  -- 絶縁テープ (no threshold)
UPDATE products SET category_id = 'cat-1', min_quantity = 50  WHERE id = 'prd-11';  -- アングル材  在庫130 → OK
UPDATE products SET category_id = 'cat-1', min_quantity = 500 WHERE id = 'prd-12';  -- ナット  在庫2300 → OK

-- -----------------------------------------------
-- 出荷先 (Customers)
-- -----------------------------------------------
INSERT INTO customers (id, name, tel, zipcode, address, email, note, created_at, updated_at) VALUES
  ('cust-1', '東京機械工業株式会社',   '03-2345-6789', '130-0021', '東京都墨田区緑1-2-3',               'purchase@tki.co.jp',    NULL, '2026-01-15T09:00:00.000Z', '2026-01-15T09:00:00.000Z'),
  ('cust-2', '大阪製造株式会社',       '06-3456-7890', '553-0001', '大阪府大阪市福島区海老江3-4-5',       'order@osaka-mfg.co.jp', NULL, '2026-01-20T09:00:00.000Z', '2026-01-20T09:00:00.000Z'),
  ('cust-3', '名古屋精工株式会社',     '052-234-5678', '460-0002', '愛知県名古屋市中区丸の内2-3-4',       'supply@ngseiko.co.jp',  NULL, '2026-02-01T09:00:00.000Z', '2026-02-01T09:00:00.000Z');

-- 既存の出荷伝票に出荷先を紐付け
UPDATE shipping_slips SET customer_id = 'cust-1' WHERE id IN ('shp-1', 'shp-4', 'shp-7');
UPDATE shipping_slips SET customer_id = 'cust-2' WHERE id IN ('shp-2', 'shp-5');
UPDATE shipping_slips SET customer_id = 'cust-3' WHERE id IN ('shp-3', 'shp-6');

-- -----------------------------------------------
-- 発注伝票 (Purchase Orders)
-- -----------------------------------------------
-- NOTE: admin account uses full UUID '3ec44910-4c53-4c9d-b027-78dcef250625' (not 'acc-1')
INSERT INTO purchase_orders (id, order_number, ordered_at, expected_at, supplier_id, account_id, status, note, created_at) VALUES
  ('po-1', 'PO-2026-001', '2026-04-28', '2026-05-10', 'sup-5', '3ec44910-4c53-4c9d-b027-78dcef250625', 'received',  '電子基板の補充発注',    '2026-04-28T09:00:00.000Z'),
  ('po-2', 'PO-2026-002', '2026-05-08', '2026-05-20', 'sup-2', 'acc-2',                                'ordered',   '鉄板・銅パイプ定期発注', '2026-05-08T10:00:00.000Z'),
  ('po-3', 'PO-2026-003', '2026-05-14', '2026-05-28', 'sup-7', '3ec44910-4c53-4c9d-b027-78dcef250625', 'draft',     '',                      '2026-05-14T11:00:00.000Z');

INSERT INTO purchase_order_details (id, order_id, product_id, line_no, quantity) VALUES
  -- PO-001: 電子基板×50, 絶縁テープ×30
  ('pod-1-1', 'po-1', 'prd-6',  1, 50),
  ('pod-1-2', 'po-1', 'prd-10', 2, 30),
  -- PO-002: 鉄板×200kg, 銅パイプ×80m
  ('pod-2-1', 'po-2', 'prd-3', 1, 200),
  ('pod-2-2', 'po-2', 'prd-4', 2, 80),
  -- PO-003: ゴムパッキン×300, 防錆スプレー×60
  ('pod-3-1', 'po-3', 'prd-7', 1, 300),
  ('pod-3-2', 'po-3', 'prd-8', 2, 60);

-- -----------------------------------------------
-- 棚卸スケジュール (Inventory Schedules)
-- -----------------------------------------------
INSERT INTO inventory_schedules (id, scheduled_at, title, note, status, created_at) VALUES
  ('sch-1', '2026-04-30', '4月末月次棚卸',       '月末定例棚卸。全商品対象。',               'completed', '2026-04-20T09:00:00.000Z'),
  ('sch-2', '2026-05-31', '5月末月次棚卸',       '月末定例棚卸。全商品対象。',               'planned',   '2026-05-01T09:00:00.000Z'),
  ('sch-3', '2026-06-30', '第2四半期棚卸',       '四半期棚卸。精密機器・電子部品を重点確認。', 'planned',   '2026-05-15T09:00:00.000Z');
