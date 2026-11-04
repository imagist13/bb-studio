/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import type { ISqliteDriver, IStatement } from '@process/services/database/drivers/ISqliteDriver';
import { getMigrationsToRun, getMigrationsToRollback } from '@process/services/database/migrations';

/**
 * `better-sqlite3` is compiled for Electron's ABI in this repo, so the unit
 * suite cannot load it. `node:sqlite` has the same SQL semantics and enough of
 * the driver surface for a migration that only issues `exec` statements.
 */
function makeDriver(): { driver: ISqliteDriver; db: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  const driver: ISqliteDriver = {
    prepare: (sql) => db.prepare(sql) as unknown as IStatement,
    exec: (sql) => db.exec(sql),
    pragma: () => undefined,
    transaction:
      <T>(fn: (...args: unknown[]) => T) =>
      (...args: unknown[]) =>
        fn(...args),
    close: () => db.close(),
  };
  return { driver, db };
}

function seedLegacyRows(db: DatabaseSync): void {
  db.exec('CREATE TABLE conversations (id TEXT PRIMARY KEY, type TEXT NOT NULL)');
  db.exec('CREATE TABLE messages (id TEXT PRIMARY KEY, content TEXT NOT NULL)');
  db.exec('CREATE TABLE teams (id TEXT PRIMARY KEY, agents TEXT)');
  db.exec(`INSERT INTO conversations (id, type) VALUES ('c_builtin', 'aionrs'), ('c_acp', 'acp')`);
  db.exec(
    `INSERT INTO messages (id, content) VALUES ('m_plain', 'plain text'),
     ('m_markers', 'a [[AION_FILES]] b [[AION_SESSIONS]]c[[/AION_SESSIONS]] d [[AION_SESSION_MESSAGE]]e[[/AION_SESSION_MESSAGE]]')`
  );
  db.exec(
    `INSERT INTO teams (id, agents) VALUES ('t1', '[{"backend":"aionrs"},{"backend": "aionrs"},{"conversation_type":"aionrs"}]')`
  );
}

function readScalar(db: DatabaseSync, sql: string): unknown {
  const row = db.prepare(sql).get() as Record<string, unknown> | undefined;
  return row ? Object.values(row)[0] : undefined;
}

describe('migration v27 (built-in engine aionrs -> bbrs)', () => {
  it('rewrites conversation types, message markers and team snapshots', () => {
    const { driver, db } = makeDriver();
    seedLegacyRows(db);

    const [migration] = getMigrationsToRun(26, 27);
    expect(migration.version).toBe(27);
    migration.up(driver);

    expect(readScalar(db, "SELECT type FROM conversations WHERE id = 'c_builtin'")).toBe('bbrs');
    expect(readScalar(db, "SELECT type FROM conversations WHERE id = 'c_acp'")).toBe('acp');
    expect(readScalar(db, "SELECT content FROM messages WHERE id = 'm_markers'")).toBe(
      'a [[BB_FILES]] b [[BB_SESSIONS]]c[[/BB_SESSIONS]] d [[BB_SESSION_MESSAGE]]e[[/BB_SESSION_MESSAGE]]'
    );
    expect(readScalar(db, "SELECT content FROM messages WHERE id = 'm_plain'")).toBe('plain text');
    expect(readScalar(db, "SELECT agents FROM teams WHERE id = 't1'")).toBe(
      '[{"backend":"bbrs"},{"backend": "bbrs"},{"conversation_type":"bbrs"}]'
    );
    driver.close();
  });

  it('rolls back to the legacy engine id and markers', () => {
    const { driver, db } = makeDriver();
    seedLegacyRows(db);
    getMigrationsToRun(26, 27)[0].up(driver);

    const [rollback] = getMigrationsToRollback(27, 26);
    expect(rollback.version).toBe(27);
    rollback.down(driver);

    expect(readScalar(db, "SELECT type FROM conversations WHERE id = 'c_builtin'")).toBe('aionrs');
    expect(readScalar(db, "SELECT content FROM messages WHERE id = 'm_markers'")).toBe(
      'a [[AION_FILES]] b [[AION_SESSIONS]]c[[/AION_SESSIONS]] d [[AION_SESSION_MESSAGE]]e[[/AION_SESSION_MESSAGE]]'
    );
    expect(readScalar(db, "SELECT agents FROM teams WHERE id = 't1'")).toBe(
      '[{"backend":"aionrs"},{"backend": "aionrs"},{"conversation_type":"aionrs"}]'
    );
    driver.close();
  });
});
