import { datetime, int, mysqlEnum, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 80 }).notNull(),
  email: varchar('email', { length: 255 }),
  role: mysqlEnum('role', ['rider', 'fitter']).notNull().default('rider'),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
}, (table) => [uniqueIndex('users_email').on(table.email)]);

export const identities = mysqlTable('identities', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: mysqlEnum('provider', ['google', 'yandex', 'telegram']).notNull(),
  providerUserId: varchar('provider_user_id', { length: 64 }).notNull(),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
}, (table) => [uniqueIndex('identities_provider').on(table.provider, table.providerUserId)]);

export const sessions = mysqlTable('sessions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: datetime('expires_at', { mode: 'date' }).notNull(),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
});

export const oauthStates = mysqlTable('oauth_states', {
  state: varchar('state', { length: 64 }).primaryKey(),
  provider: mysqlEnum('provider', ['google', 'yandex']).notNull(),
  userId: int('user_id').references(() => users.id, { onDelete: 'cascade' }),
  next: varchar('next', { length: 200 }).notNull(),
  expiresAt: datetime('expires_at', { mode: 'date' }).notNull(),
});

export const profiles = mysqlTable('profiles', {
  userId: int('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  rider: mysqlEnum('rider', ['child', 'teen', 'adult']),
  heightCm: int('height_cm'),
  inseamCm: int('inseam_cm'),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull(),
});

export const bikes = mysqlTable('bikes', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 40 }).notNull(),
  fit: mysqlEnum('fit', ['city', 'endurance', 'race', 'mtb']).notNull(),
  crankMm: int('crank_mm'),
  saddleMm: int('saddle_mm'),
  stemMm: int('stem_mm'),
  dropMm: int('drop_mm'),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull(),
});

export const readings = mysqlTable('readings', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bikeId: int('bike_id').references(() => bikes.id, { onDelete: 'set null' }),
  fit: mysqlEnum('fit', ['city', 'endurance', 'race', 'mtb']).notNull(),
  knee: int('knee'),
  back: int('back'),
  arm: int('arm'),
  hip: int('hip'),
  hadTop: int('had_top').notNull(),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
});
