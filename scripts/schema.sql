-- Creative Desk schema. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS brands (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  website       TEXT NOT NULL DEFAULT '',
  product       TEXT NOT NULL DEFAULT '',
  audience      TEXT NOT NULL DEFAULT '',
  voice         TEXT NOT NULL DEFAULT '',
  proof_points  TEXT NOT NULL DEFAULT '',
  allowed_claims TEXT NOT NULL DEFAULT '',
  banned_claims TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id          BIGSERIAL PRIMARY KEY,
  brand_id    BIGINT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  objective   TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  archived    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaigns_brand_idx ON campaigns(brand_id);

-- status: idea | scripted | production | review | approved | killed
CREATE TABLE IF NOT EXISTS concepts (
  id          BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  hook        TEXT NOT NULL DEFAULT '',
  angle       TEXT NOT NULL DEFAULT '',
  format      TEXT NOT NULL DEFAULT '',
  awareness   TEXT NOT NULL DEFAULT '',
  persona     TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'idea',
  source      TEXT NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS concepts_campaign_idx ON concepts(campaign_id);

-- A script version. `beats` is the script and shot list in one:
-- [{ start, end, visual, vo, on_screen, shot_type, prompt }]
CREATE TABLE IF NOT EXISTS scripts (
  id          BIGSERIAL PRIMARY KEY,
  concept_id  BIGINT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  version     INT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  duration    INT NOT NULL DEFAULT 30,
  beats       JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta         TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (concept_id, version)
);

-- status: draft | in_review | changes_requested | approved | rejected
CREATE TABLE IF NOT EXISTS assets (
  id            BIGSERIAL PRIMARY KEY,
  concept_id    BIGINT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  script_id     BIGINT REFERENCES scripts(id) ON DELETE SET NULL,
  shot_index    INT,
  version       INT NOT NULL,
  label         TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL,
  url           TEXT NOT NULL,
  pathname      TEXT NOT NULL,
  content_type  TEXT NOT NULL DEFAULT '',
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  width         INT,
  height        INT,
  duration_sec  REAL,
  thumb_url     TEXT,
  thumb_pathname TEXT,
  tool          TEXT NOT NULL DEFAULT '',
  prompt        TEXT NOT NULL DEFAULT '',
  settings      TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_concept_idx ON assets(concept_id);

CREATE TABLE IF NOT EXISTS comments (
  id          BIGSERIAL PRIMARY KEY,
  asset_id    BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  author      TEXT NOT NULL DEFAULT 'You',
  from_client BOOLEAN NOT NULL DEFAULT false,
  body        TEXT NOT NULL,
  timecode    REAL,
  verdict     TEXT,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_asset_idx ON comments(asset_id);

CREATE TABLE IF NOT EXISTS share_links (
  token       TEXT PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT '',
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
