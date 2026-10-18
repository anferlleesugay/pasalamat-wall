package com.pasalamat.notes.note;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "reactions")
public class Reaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "note_id", nullable = false)
    private Long noteId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Reaction() {
    }

    public Reaction(Long noteId) {
        this.noteId = noteId;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Long getNoteId() { return noteId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}