// ============================================================
// Dexie.js IndexedDB 数据库
// ============================================================

import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Talent } from './schema';

export class TalentDB extends Dexie {
  talents!: Table<Talent, number>;

  constructor() {
    super('TalentManagerDB');
    this.version(1).stores({
      talents: '++id, status, pool_type, reserve_level, department, gender, education, name, skills, created_at',
    });
  }
}

export const db = new TalentDB();
