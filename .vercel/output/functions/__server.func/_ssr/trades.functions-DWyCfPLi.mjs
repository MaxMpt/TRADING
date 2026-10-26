import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { a as nameOf, c as venueOf } from "./market-CFNBOnBe.mjs";
import { d as withEntry, i as explainLoss, l as sizeOrder, n as brackets, u as tradePnl } from "./playbook-BuNJqG3v.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/trades.functions-DWyCfPLi.js
var _0002_trades_default = "create table if not exists desk_account (\n  id integer primary key,\n  capital double precision not null,\n  cash double precision not null,\n  commission_pct double precision not null,\n  risk_pct double precision not null,\n  size_pct double precision not null,\n  constraint desk_account_one check (id = 1)\n);\n\ninsert into desk_account (id, capital, cash, commission_pct, risk_pct, size_pct)\nvalues (1, 1000000, 1000000, 0.05, 0.6, 20)\non conflict (id) do nothing;\n\ncreate table if not exists trades (\n  id text primary key,\n  ticker text not null,\n  name text not null,\n  side text not null,\n  qty integer not null,\n  price_open double precision not null,\n  price_close double precision,\n  amount double precision not null,\n  opened_at timestamptz not null,\n  closed_at timestamptz,\n  pnl double precision,\n  commission double precision not null default 0,\n  reason text,\n  stop double precision not null,\n  target double precision not null,\n  via text not null\n);\n\ncreate index if not exists trades_ticker_idx on trades (ticker);\ncreate index if not exists trades_closed_idx on trades (closed_at);\n";
var _0003_qty_fraction_default = "alter table trades alter column qty type double precision;\n";
var _0004_agent_default = "alter table desk_account add column if not exists agent_on boolean not null default true;\n";
var _0005_lesson_default = "alter table trades add column if not exists lesson text;\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const dataDir = process.env.VERCEL ? void 0 : "/workspace/data/ordo";
		const parsers = {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		};
		const open = async (dir) => {
			if (dir) {
				const { mkdirSync } = await import("node:fs");
				mkdirSync(dir, { recursive: true });
			}
			const pg = new PGlite(dir, { parsers });
			await pg.waitReady;
			await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
			return pg;
		};
		if (!dataDir) return open(void 0);
		try {
			return await open(dataDir);
		} catch (error) {
			const { renameSync, rmSync } = await import("node:fs");
			const broken = `${dataDir}.broken-${Date.now()}`;
			try {
				renameSync(dataDir, broken);
			} catch {
				rmSync(dataDir, {
					recursive: true,
					force: true
				});
			}
			console.error("[db] журнал не открылся, начат новый бумажный счёт", error);
			return open(dataDir);
		}
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({
			"/migrations/0002_trades.sql": _0002_trades_default,
			"/migrations/0003_qty_fraction.sql": _0003_qty_fraction_default,
			"/migrations/0004_agent.sql": _0004_agent_default,
			"/migrations/0005_lesson.sql": _0005_lesson_default
		});
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the file-backed DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
});
function num(value) {
	const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	return Number.isFinite(n) ? n : 0;
}
function mapTrade(row) {
	return {
		id: String(row.id),
		ticker: String(row.ticker),
		name: String(row.name),
		side: row.side === "short" ? "short" : "long",
		qty: num(row.qty),
		priceOpen: num(row.price_open),
		priceClose: row.price_close == null ? null : num(row.price_close),
		amount: num(row.amount),
		openedAt: num(row.opened_at),
		closedAt: row.closed_at == null ? null : num(row.closed_at),
		pnl: row.pnl == null ? null : num(row.pnl),
		commission: num(row.commission),
		reason: row.reason == null ? null : String(row.reason),
		stop: num(row.stop),
		target: num(row.target),
		via: row.via === "hand" ? "hand" : "agent",
		lesson: row.lesson == null ? null : String(row.lesson)
	};
}
var LIST_SQL = `select id, ticker, name, side, qty, price_open, price_close, amount,
  (extract(epoch from opened_at) * 1000)::float8 as opened_at,
  case when closed_at is null then null else (extract(epoch from closed_at) * 1000)::float8 end as closed_at,
  pnl, commission, reason, stop, target, via, lesson
  from trades
  order by opened_at desc
  limit 200`;
function clampPct(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function knownTicker(ticker) {
	return venueOf(ticker) !== null;
}
async function readBook() {
	const sql = await getSql();
	const row = (await sql`
    select capital, cash, commission_pct, risk_pct, size_pct, agent_on from desk_account where id = 1
  `)[0];
	const account = row ? {
		capital: num(row.capital),
		cash: num(row.cash),
		commissionPct: num(row.commission_pct),
		riskPct: num(row.risk_pct),
		sizePct: num(row.size_pct),
		agentOn: row.agent_on !== false && row.agent_on !== "false"
	} : {
		capital: 1e6,
		cash: 1e6,
		commissionPct: .05,
		riskPct: .6,
		sizePct: 20,
		agentOn: true
	};
	const trades = (await sql.query(LIST_SQL)).map(mapTrade);
	for (const trade of trades) {
		if (trade.pnl == null || trade.pnl >= 0 || trade.lesson || trade.closedAt == null || trade.priceClose == null) continue;
		const text = explainLoss({
			ticker: trade.ticker,
			side: trade.side,
			entry: trade.priceOpen,
			stop: trade.stop,
			exit: trade.priceClose,
			heldMs: Math.max(0, trade.closedAt - trade.openedAt)
		});
		trade.lesson = text;
		await sql`update trades set lesson = ${text} where id = ${trade.id} and lesson is null`;
	}
	return {
		account,
		open: trades.filter((trade) => trade.closedAt == null),
		closed: trades.filter((trade) => trade.closedAt != null)
	};
}
var loadDesk_createServerFn_handler = createServerRpc({
	id: "fac19c061c7c654b573618e20dd7639e79fdf3228f58f8aafa80192cd81ac26b",
	name: "loadDesk",
	filename: "src/lib/trades.functions.ts"
}, (opts) => loadDesk.__executeServer(opts));
var loadDesk = createServerFn({ method: "GET" }).handler(loadDesk_createServerFn_handler, async () => readBook());
var saveAccount_createServerFn_handler = createServerRpc({
	id: "c01585d3a88b280cf38c1073e8829e1a06cccf03122680883c6c2814180f1e39",
	name: "saveAccount",
	filename: "src/lib/trades.functions.ts"
}, (opts) => saveAccount.__executeServer(opts));
var saveAccount = createServerFn({ method: "POST" }).validator((input) => {
	const source = input;
	return {
		commissionPct: typeof source.commissionPct === "number" ? source.commissionPct : null,
		riskPct: typeof source.riskPct === "number" ? source.riskPct : null,
		sizePct: typeof source.sizePct === "number" ? source.sizePct : null,
		capital: typeof source.capital === "number" ? source.capital : null,
		agentOn: typeof source.agentOn === "boolean" ? source.agentOn : null
	};
}).handler(saveAccount_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const current = await readBook();
	await sql`
      update desk_account
      set commission_pct = ${data.commissionPct == null ? current.account.commissionPct : clampPct(data.commissionPct, 0, 1)}, risk_pct = ${data.riskPct == null ? current.account.riskPct : clampPct(data.riskPct, .15, 3)}, size_pct = ${data.sizePct == null ? current.account.sizePct : clampPct(data.sizePct, 1, 100)}
      where id = 1
    `;
	if (data.capital != null) {
		if (current.open.length > 0) throw new Error("Сначала закройте открытые сделки");
		const capital = clampPct(data.capital, 1e4, 1e8);
		await sql`update desk_account set capital = ${capital}, cash = ${capital} where id = 1`;
	}
	if (data.agentOn != null) await sql`update desk_account set agent_on = ${data.agentOn} where id = 1`;
	return readBook();
});
async function placeOpen(data) {
	const sql = await getSql();
	const book = await readBook();
	if (book.open.some((trade) => trade.ticker === data.ticker)) throw new Error(`По ${data.ticker} уже есть открытая сделка`);
	const name = nameOf(data.ticker);
	const reserved = book.open.reduce((sum, trade) => sum + trade.amount, 0);
	const sized = sizeOrder({
		cash: book.account.cash,
		reserved,
		capital: book.account.capital,
		sizePct: book.account.sizePct,
		price: data.price,
		lot: data.lot,
		commissionPct: book.account.commissionPct
	});
	if ("error" in sized) throw new Error(sized.error);
	const planned = data.stop > 0 ? withEntry(data.side, data.price, data.stop) : null;
	if (data.stop > 0 && !planned) throw new Error("Стоп не подходит к цене входа");
	const fallback = brackets(data.side, data.price, book.account.riskPct);
	const stop = planned?.stop ?? fallback.stop;
	const target = planned?.target ?? fallback.target;
	if (!(target > 0) || !(stop > 0)) throw new Error("Тейк или стоп вышел за ноль");
	if (!(await sql`
    insert into trades (
      id, ticker, name, side, qty, price_open, amount, opened_at, commission, stop, target, via
    )
    select
      ${`t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`}, ${data.ticker}, ${name}, ${data.side}, ${sized.qty}, ${data.price}, ${sized.amount},
      now(), ${sized.fee}, ${stop}, ${target}, ${data.via}
    where not exists (
      select 1 from trades where ticker = ${data.ticker} and closed_at is null
    )
    returning id
  `).length) throw new Error(`По ${data.ticker} уже есть открытая сделка`);
	await sql`update desk_account set cash = cash - ${sized.fee} where id = 1`;
	return readBook();
}
async function placeClose(data) {
	const sql = await getSql();
	const book = await readBook();
	const trade = book.open.find((item) => item.id === data.id);
	if (!trade) throw new Error("Сделка уже закрыта");
	const result = tradePnl(trade.side, trade.qty, trade.priceOpen, data.price, book.account.commissionPct);
	const cashDelta = result.gross - result.feeClose;
	const heldMs = trade.openedAt > 0 ? Date.now() - trade.openedAt : 0;
	const lesson = result.pnl < 0 ? explainLoss({
		ticker: trade.ticker,
		side: trade.side,
		entry: trade.priceOpen,
		stop: trade.stop,
		exit: data.price,
		heldMs
	}) : null;
	await sql`
    update trades
    set price_close = ${data.price},
        closed_at = now(),
        pnl = ${result.pnl},
        commission = ${result.commission},
        reason = ${data.reason},
        lesson = ${lesson}
    where id = ${data.id} and closed_at is null
  `;
	await sql`update desk_account set cash = cash + ${cashDelta} where id = 1`;
	return readBook();
}
var openTrade_createServerFn_handler = createServerRpc({
	id: "aaed0b06985cbf8ac19c8177bc0ec365fa8861b105c9c6ff09db42e2ceca84f6",
	name: "openTrade",
	filename: "src/lib/trades.functions.ts"
}, (opts) => openTrade.__executeServer(opts));
var openTrade = createServerFn({ method: "POST" }).validator((input) => {
	const source = input;
	const ticker = typeof source.ticker === "string" ? source.ticker : "";
	const side = source.side === "short" ? "short" : "long";
	const via = source.via === "hand" ? "hand" : "agent";
	const price = typeof source.price === "number" ? source.price : 0;
	const lot = typeof source.lot === "number" ? source.lot : 1;
	const stop = typeof source.stop === "number" && source.stop > 0 ? source.stop : 0;
	if (!knownTicker(ticker) || !(price > 0)) throw new Error("Некорректная заявка");
	return {
		ticker,
		side,
		via,
		price,
		lot: lot > 0 ? lot : 1,
		stop
	};
}).handler(openTrade_createServerFn_handler, async ({ data }) => placeOpen(data));
var closeTrade_createServerFn_handler = createServerRpc({
	id: "d811384f0b97752985f005ad84bd0b0fd3b120caca30fce8230a7b73d4beff8c",
	name: "closeTrade",
	filename: "src/lib/trades.functions.ts"
}, (opts) => closeTrade.__executeServer(opts));
var closeTrade = createServerFn({ method: "POST" }).validator((input) => {
	const source = input;
	const id = typeof source.id === "string" ? source.id : "";
	const price = typeof source.price === "number" ? source.price : 0;
	const reason = source.reason === "target" || source.reason === "stop" || source.reason === "manual" ? source.reason : "manual";
	if (!id || !(price > 0)) throw new Error("Нечем закрывать");
	return {
		id,
		price,
		reason
	};
}).handler(closeTrade_createServerFn_handler, async ({ data }) => placeClose(data));
//#endregion
export { closeTrade_createServerFn_handler, loadDesk_createServerFn_handler, openTrade_createServerFn_handler, saveAccount_createServerFn_handler };
