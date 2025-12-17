import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { user } from "./db/schema";

export const twoFactor = pgTable("two_factor", {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").default(false),
});
