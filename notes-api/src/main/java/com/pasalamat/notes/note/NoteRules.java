package com.pasalamat.notes.note;

import java.util.Locale;
import java.util.Set;

public final class NoteRules {

    public static final Set<String> CATEGORIES = Set.of("classmate", "teacher", "staff", "other");

    private NoteRules() {
    }

    public static String cleanName(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Anonymous";
        }
        return raw.trim().replaceAll("\\s+", " ");
    }

    public static String cleanMessage(String raw) {
        return raw.trim().replaceAll("\\s+", " ");
    }

    public static String cleanCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return "classmate";
        }
        String category = raw.trim().toLowerCase(Locale.ROOT);
        return CATEGORIES.contains(category) ? category : "other";
    }
}