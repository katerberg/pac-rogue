CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  install_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  game_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  outcome TEXT NOT NULL,
  final_level INTEGER NOT NULL,
  pellets INTEGER NOT NULL,
  country TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  received_at TEXT NOT NULL,
  record TEXT NOT NULL,
  hidden_reason TEXT
);
CREATE INDEX runs_ip_received ON runs (ip_hash, received_at);
CREATE INDEX runs_install ON runs (install_id);
CREATE INDEX runs_received ON runs (received_at);
