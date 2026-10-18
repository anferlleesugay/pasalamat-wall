package com.pasalamat.notes.note;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateNoteRequest(
        @NotBlank(message = "Who is this note for?")
        @Size(max = 60, message = "Name must be 60 characters or less")
        String toName,

        @Size(max = 60, message = "Name must be 60 characters or less")
        String fromName,

        @NotBlank(message = "Message cannot be empty")
        @Size(min = 3, max = 280, message = "Message must be 3 to 280 characters")
        String message,

        String category
) {
}