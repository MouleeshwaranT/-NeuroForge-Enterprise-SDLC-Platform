package com.example.demo.Controller;

import com.example.demo.model.ChatMessage;
import com.example.demo.service.ChatMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/chat-messages")
public class ChatMessageController {
    private final ChatMessageService service;
    public ChatMessageController(ChatMessageService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<ChatMessage> create(@RequestBody ChatMessage entity) { return ResponseEntity.ok(service.create(entity)); }
    @GetMapping
    public ResponseEntity<List<ChatMessage>> getAll() { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/{id}")
    public ResponseEntity<ChatMessage> getById(@PathVariable Long id) { return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<ChatMessage> update(@PathVariable Long id, @RequestBody ChatMessage entity) { return ResponseEntity.ok(service.update(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.ok().build(); }
}
