package com.pasalamat.notes.note;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {

    long countByNoteId(Long noteId);

    @Query("select r.noteId as noteId, count(r) as total "
         + "from Reaction r where r.noteId in :ids group by r.noteId")
    List<HeartCount> countByNoteIds(@Param("ids") Collection<Long> ids);

    interface HeartCount {
        Long getNoteId();
        long getTotal();
    }
}