package com.pasalamat.notes.note;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NoteRulesTest {

    @Test
    void blankFromNameBecomesAnonymous() {
        assertThat(NoteRules.cleanName(null)).isEqualTo("Anonymous");
        assertThat(NoteRules.cleanName("   ")).isEqualTo("Anonymous");
    }

    @Test
    void namesAreTrimmedAndExtraSpacesRemoved() {
        assertThat(NoteRules.cleanName("  Sir    Cruz  ")).isEqualTo("Sir Cruz");
    }

    @Test
    void messageExtraSpacesAreCollapsed() {
        assertThat(NoteRules.cleanMessage("  Thanks    a   lot!  ")).isEqualTo("Thanks a lot!");
    }

    @Test
    void knownCategoryIsKeptInLowercase() {
        assertThat(NoteRules.cleanCategory("TEACHER")).isEqualTo("teacher");
    }

    @Test
    void unknownCategoryBecomesOther() {
        assertThat(NoteRules.cleanCategory("alien")).isEqualTo("other");
    }

    @Test
    void missingCategoryDefaultsToClassmate() {
        assertThat(NoteRules.cleanCategory(null)).isEqualTo("classmate");
    }
}