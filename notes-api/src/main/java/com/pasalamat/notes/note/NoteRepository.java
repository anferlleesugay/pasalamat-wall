package com.pasalamat.notes.note;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findTop50ByStatusOrderByCreatedAtDesc(NoteStatus status);

    long countByStatus(NoteStatus status);
}