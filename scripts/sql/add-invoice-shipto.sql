-- One nullable column on invoice_payments, so a payment can carry the
-- address the customer typed on the pay page.
--
-- Run this once, in phpMyAdmin or any MySQL client. It adds a column and
-- touches no existing row, so there is nothing to undo and nothing to lose.
--
-- Deliberately not `prisma db push`: the schema has unrelated drift in it
-- (three tables whose updatedAt defaults differ from the model) and a push
-- would apply those too.
--
-- Until it is run, the pay page still works: the address is written into the
-- payment's note instead, so nothing a customer types is lost.

ALTER TABLE `invoice_payments` ADD COLUMN `shipTo` JSON NULL;
