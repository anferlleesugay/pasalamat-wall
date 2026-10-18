package com.pasalamat.notes.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    NoteRepository notes;

    @Mock
    ReactionRepository reactions;

    @InjectMocks
    NoteService service;

    @Test
    void createSavesNoteAsPendingWithCleanedInput() {
        when(notes.save(any(Note.class))).thenAnswer(call -> call.getArgument(0));

        NoteResponse result = service.create(
                new CreateNoteRequest("  Sir Cruz ", "", "Thanks   a lot!", "TEACHER"));

        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.toName()).isEqualTo("Sir Cruz");
        assertThat(result.fromName()).isEqualTo("Anonymous");
        assertThat(result.message()).isEqualTo("Thanks a lot!");
        assertThat(result.category()).isEqualTo("teacher");
        assertThat(result.hearts()).isZero();
    }

    @Test
    void heartOnApprovedNoteSavesReactionAndReturnsCount() {
        Note approved = mock(Note.class);
        when(approved.getId()).thenReturn(1L);
        when(approved.getStatus()).thenReturn(NoteStatus.APPROVED);
        when(notes.findById(1L)).thenReturn(Optional.of(approved));
        when(reactions.countByNoteId(1L)).thenReturn(7L);

        long hearts = service.addHeart(1L);

        assertThat(hearts).isEqualTo(7L);
        verify(reactions).save(any(Reaction.class));
    }

    @Test
    void heartOnPendingNoteIsRejected() {
        Note pending = new Note("Sir Cruz", "Anferl", "Hello there", "teacher");
        when(notes.findById(5L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.addHeart(5L))
                .isInstanceOf(ResponseStatusException.class);
        verify(reactions, never()).save(any());
    }

    @Test
    void heartOnMissingNoteIsRejected() {
        when(notes.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addHeart(99L))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void listApprovedReturnsEmptyListWhenThereAreNoNotes() {
        when(notes.findTop50ByStatusOrderByCreatedAtDesc(NoteStatus.APPROVED)).thenReturn(List.of());

        assertThat(service.listApproved()).isEmpty();
        verifyNoInteractions(reactions);
    }

    @Test
    void statsHasACountForEveryStatus() {
        when(notes.countByStatus(any())).thenReturn(2L);

        Map<String, Long> stats = service.stats();

        assertThat(stats).containsOnlyKeys("pending", "approved", "flagged");
    }
}