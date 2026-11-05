-- The table behind the Traffic screen in the admin.
--
-- Normally created by `npm run db:push`, which reads prisma/schema.prisma
-- and adds whatever is missing. This file is here for the case where the
-- schema cannot be pushed from a machine and the table has to be made by
-- hand, in phpMyAdmin or the Hostinger console.
--
-- It only adds a table. Nothing already in the database is touched.

CREATE TABLE `visits` (
    `id` VARCHAR(191) NOT NULL,
    `visitor` VARCHAR(44) NOT NULL,
    `session` VARCHAR(44) NOT NULL,
    `path` VARCHAR(512) NOT NULL,
    `channel` VARCHAR(16) NOT NULL,
    `source` VARCHAR(96) NOT NULL,
    `medium` VARCHAR(48) NULL,
    `campaign` VARCHAR(120) NULL,
    `referrer` VARCHAR(512) NULL,
    `device` VARCHAR(8) NOT NULL,
    `bot` BOOLEAN NOT NULL DEFAULT false,
    `crawler` VARCHAR(24) NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `visits_at_idx`(`at`),
    INDEX `visits_bot_at_idx`(`bot`, `at`),
    INDEX `visits_channel_at_idx`(`channel`, `at`),
    INDEX `visits_session_idx`(`session`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
