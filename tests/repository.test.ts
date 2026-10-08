import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import type { PluginDatabaseClient } from "@paperclipai/plugin-sdk";
import { readLedger } from "../src/repository.js";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let pg: PGlite;
let db: PluginDatabaseClient;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`CREATE TABLE cost_events(id uuid,company_id uuid,issue_id uuid,agent_id uuid,provider text,model text,billing_type text,cost_status text,input_tokens int,cached_input_tokens int,output_tokens int,cost_cents int,occurred_at timestamptz,heartbeat_run_id uuid);
 CREATE TABLE issues(id uuid,company_id uuid,identifier text,title text);
 CREATE TABLE agents(id uuid,company_id uuid,name text);
 CREATE TABLE heartbeat_runs(id uuid,company_id uuid,status text,created_at timestamptz);
 INSERT INTO cost_events SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${COMPANY}',null,null,'openai','gpt-5.4','subscription','reported',100,10,10,0,'2026-10-08T10:00:00.123456Z',null FROM generate_series(1,1001) n;
 INSERT INTO cost_events VALUES ('99999999-9999-4999-8999-999999999999','${OTHER}',null,null,'openai','private','subscription','reported',9000000,0,0,0,'2026-10-08',null);
 INSERT INTO heartbeat_runs VALUES ('11111111-1111-4111-8111-111111111111','${COMPANY}','failed','2026-10-08'),('22222222-2222-4222-8222-222222222222','${OTHER}','failed','2026-10-08'),('33333333-3333-4333-8333-333333333333','${COMPANY}','running','2026-10-08');`);
  db = {
    namespace: "plugin_token_clip_test",
    query: async <T>(sql: string, params?: unknown[]) =>
      (await pg.query<T>(sql, params)).rows,
    execute: async () => {
      throw new Error("Read-only test");
    },
  };
}, 20_000);
afterAll(async () => pg.close());
it("paginates every record, retaining microsecond cursors without duplicates", async () => {
  const result = await readLedger(db, COMPANY, "2026-10-08", "2026-10-08");
  expect(result.rows).toHaveLength(1001);
  expect(new Set(result.rows.map((r) => r.id)).size).toBe(1001);
  expect(result.unmeteredRuns).toBe(1);
  expect(result.rows.every((r) => r.model !== "private")).toBe(true);
});
it("uses inclusive dates with an exclusive next-day boundary", async () => {
  const result = await readLedger(db, COMPANY, "2026-10-07", "2026-10-07");
  expect(result.rows).toHaveLength(0);
});
it("rejects missing company and SQL injection before querying", async () => {
  await expect(
    readLedger(db, undefined, "2026-10-08", "2026-10-08"),
  ).rejects.toThrow("company");
  await expect(
    readLedger(db, "' OR 1=1", "2026-10-08", "2026-10-08"),
  ).rejects.toThrow("company");
});
it("will not join labels belonging to a different company", async () => {
  const foreign = "55555555-5555-4555-8555-555555555555";
  await pg.exec(
    `INSERT INTO issues VALUES('${foreign}','${OTHER}','SECRET','Private title'); INSERT INTO agents VALUES('${foreign}','${OTHER}','Private agent'); UPDATE cost_events SET issue_id='${foreign}',agent_id='${foreign}' WHERE id='00000000-0000-4000-8000-000000000001';`,
  );
  const result = await readLedger(db, COMPANY, "2026-10-08", "2026-10-08");
  expect(result.rows[0]?.title).toBeNull();
  expect(result.rows[0]?.agent).toBe("Deleted agent");
});
