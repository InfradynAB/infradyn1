-- Basic sanity checks after restoring a backup into a drill database.
-- Keep checks lightweight and schema-safe.

SELECT now() AS restored_at;

SELECT
  to_regclass('public.organization') IS NOT NULL AS has_organization,
  to_regclass('public.project') IS NOT NULL AS has_project,
  to_regclass('public.purchase_order') IS NOT NULL AS has_purchase_order,
  to_regclass('public.invoice') IS NOT NULL AS has_invoice,
  to_regclass('public.user') IS NOT NULL AS has_user;

SELECT count(*) AS organizations FROM organization;
SELECT count(*) AS projects FROM project;
SELECT count(*) AS purchase_orders FROM purchase_order;
SELECT count(*) AS invoices FROM invoice;
