package com.pasalamat.notes.note;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notes")
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "to_name", nullable = false, length = 60)
    private String toName;

    @Column(name = "from_name", nullable = false, length = 60)
    private String fromName;

    @Column(nullable = false, length = 280)
    private String message;

    @Column(nullable = false, length = 20)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private NoteStatus status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Note() {
        // required by JPA
    }

    public Note(String toName, String fromName, String message, String category) {
        this.toName = toName;
        this.fromName = fromName;
        this.message = message;
        this.category = category;
        this.status = NoteStatus.PENDING;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getToName() { return toName; }
    public String getFromName() { return fromName; }
    public String getMessage() { return message; }
    public String getCategory() { return category; }
    public NoteStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}