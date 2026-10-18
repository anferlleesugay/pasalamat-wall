package com.pasalamat.notes.note;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService service;

    public NoteController(NoteService service) {
        this.service = service;
    }

    @GetMapping
    public List<NoteResponse> list() {
        return service.listApproved();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse create(@Valid @RequestBody CreateNoteRequest request) {
        return service.create(request);
    }

    @PostMapping("/{id}/hearts")
    public Map<String, Object> heart(@PathVariable Long id) {
        return Map.of("id", id, "hearts", service.addHeart(id));
    }

    @GetMapping("/stats")
    public Map<String, Long> stats() {
        return service.stats();
    }
}