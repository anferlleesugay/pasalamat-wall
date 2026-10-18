package com.pasalamat.notes.note;

import java.time.OffsetDateTime;

public record NoteResponse(
        Long id,
        String toName,
        String fromName,
        String message,
        String category,
        String status,
        long hearts,
        OffsetDateTime createdAt
) {
    static NoteResponse from(Note note, long hearts) {
        return new NoteResponse(
                note.getId(),
                note.getToName(),
                note.getFromName(),
                note.getMessage(),
                note.getCategory(),
                note.getStatus().name(),
                hearts,
                note.getCreatedAt());
    }
}