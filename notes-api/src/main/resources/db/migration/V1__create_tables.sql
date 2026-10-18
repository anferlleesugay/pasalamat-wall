CREATE TABLE notes (
    id          BIGSERIAL PRIMARY KEY,
    to_name     VARCHAR(60)  NOT NULL,
    from_name   VARCHAR(60)  NOT NULL DEFAULT 'Anonymous',
    message     VARCHAR(280) NOT NULL,
    category    VARCHAR(20)  NOT NULL DEFAULT 'classmate',
    status      VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'APPROVED', 'FLAGGED')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_status_created ON notes (status, created_at DESC);

CREATE TABLE reactions (
    id          BIGSERIAL PRIMARY KEY,
    note_id     BIGINT      NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reactions_note ON reactions (note_id);

CREATE TABLE moderation_log (
    id          BIGSERIAL PRIMARY KEY,
    note_id     BIGINT       NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    verdict     VARCHAR(10)  NOT NULL,
    reason      VARCHAR(255),
    source      VARCHAR(20)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);