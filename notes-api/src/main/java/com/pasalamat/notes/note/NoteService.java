package com.pasalamat.notes.note;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NoteService {

    private final NoteRepository notes;
    private final ReactionRepository reactions;

    public NoteService(NoteRepository notes, ReactionRepository reactions) {
        this.notes = notes;
        this.reactions = reactions;
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> listApproved() {
        List<Note> approved = notes.findTop50ByStatusOrderByCreatedAtDesc(NoteStatus.APPROVED);
        if (approved.isEmpty()) {
            return List.of();
        }
        List<Long> ids = approved.stream().map(Note::getId).toList();
        Map<Long, Long> hearts = reactions.countByNoteIds(ids).stream()
                .collect(Collectors.toMap(
                        ReactionRepository.HeartCount::getNoteId,
                        ReactionRepository.HeartCount::getTotal));
        return approved.stream()
                .map(note -> NoteResponse.from(note, hearts.getOrDefault(note.getId(), 0L)))
                .toList();
    }

    @Transactional
    public NoteResponse create(CreateNoteRequest request) {
        Note note = new Note(
                request.toName().trim(),
                NoteRules.cleanName(request.fromName()),
                NoteRules.cleanMessage(request.message()),
                NoteRules.cleanCategory(request.category()));
        return NoteResponse.from(notes.save(note), 0);
    }

    @Transactional
    public long addHeart(Long noteId) {
        Note note = notes.findById(noteId)
                .filter(n -> n.getStatus() == NoteStatus.APPROVED)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Note " + noteId + " not found"));
        reactions.save(new Reaction(note.getId()));
        return reactions.countByNoteId(note.getId());
    }

    @Transactional(readOnly = true)
    public Map<String, Long> stats() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (NoteStatus status : NoteStatus.values()) {
            result.put(status.name().toLowerCase(), notes.countByStatus(status));
        }
        return result;
    }
}