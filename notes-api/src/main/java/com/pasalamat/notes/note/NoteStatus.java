package com.pasalamat.notes.note;

public enum NoteStatus {
    PENDING,   // just posted, waiting for the moderation-worker
    APPROVED,  // shown on the wall
    FLAGGED    // hidden: failed the word filter or AI tone check
}