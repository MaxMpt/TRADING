create table if not exists desk_account (
  id integer primary key,
  capital double precision not null,
  cash double precision not null,
  commission_pct double precision not null,
  risk_pct double precision not null,
  size_pct double precision not null,
  constraint desk_account_one check (id = 1)
);

insert into desk_account (id, capital, cash, commission_pct, risk_pct, size_pct)
values (1, 1000000, 1000000, 0.05, 0.6, 20)
on conflict (id) do nothing;

create table if not exists trades (
  id text primary key,
  ticker text not null,
  name text not null,
  side text not null,
  qty integer not null,
  price_open double precision not null,
  price_close double precision,
  amount double precision not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  pnl double precision,
  commission double precision not null default 0,
  reason text,
  stop double precision not null,
  target double precision not null,
  via text not null
);

create index if not exists trades_ticker_idx on trades (ticker);
create index if not exists trades_closed_idx on trades (closed_at);
