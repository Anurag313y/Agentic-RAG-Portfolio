import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const portfolioContent = sqliteTable("portfolio_content", {
  id: integer("id").primaryKey(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const contactMessages = sqliteTable("contact_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const ragChunks = sqliteTable("rag_chunks", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
