package com.tamton.bingolfy.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;


@Component
@RequiredArgsConstructor
public class GameHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final GameService gameService;

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final Map<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionRooms = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUsers = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        System.out.println("User connected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        var jsonNode = objectMapper.readTree(message.getPayload());
        String type = jsonNode.get("type").asText();

        switch (type) {
            case "join_room" -> handleJoinRoom(session, jsonNode);
            case "user_ready" -> handleUserReady(session, jsonNode);
            case "tile_clicked" -> handleTileClicked(session, jsonNode);
            case "user_won" -> handleUserWon(session, jsonNode);
            case "set_next_player" -> handleSetNextPlayer(session, jsonNode);
            case "leave_room" -> handleLeaveRoom(session);
            case "setup_complete" -> handleSetupComplete(session);
            default -> System.err.println("Unknown message type: " + type);
        }
    }

    private void handleJoinRoom(WebSocketSession session, com.fasterxml.jackson.databind.JsonNode json) throws Exception {
        String room = json.get("room").asText();
        String name = json.get("name").asText();

        String prevRoom = sessionRooms.get(session.getId());
        if (prevRoom != null && !prevRoom.equals(room)) {
            handleLeaveRoom(session);
        }

        var users = gameService.joinRoom(room, name);
        if (users == null) {
            sendToSession(session, "error", "Room is full");
            return;
        }

        roomSessions.computeIfAbsent(room, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionRooms.put(session.getId(), room);
        sessionUsers.put(session.getId(), name);

        broadcastToRoom(room, "user_joined", users);
    }

    private void handleUserReady(WebSocketSession session, com.fasterxml.jackson.databind.JsonNode json) throws Exception {
        String room = json.get("room").asText();
        String user = json.get("user").asText();
        gameService.setUserReady(room, user);

        broadcastToRoom(room, "user_joined", gameService.getUsers(room));

        if (gameService.getUserCount(room) >= 2 && gameService.allReady(room)) {
            gameService.resetAllReady(room);
            var randomPlayer = gameService.getRandomPlayer(room);
            broadcastToRoom(room, "all_ready", java.util.Map.of("firstPlayer", randomPlayer.getName()));
        }
    }

    private void handleTileClicked(WebSocketSession session, com.fasterxml.jackson.databind.JsonNode json) throws Exception {
        String room = json.get("room").asText();
        var tiles = objectMapper.treeToValue(json.get("tiles"), Object.class);
        broadcastToRoom(room, "flush", tiles, session);
    }

    private void handleUserWon(WebSocketSession session, com.fasterxml.jackson.databind.JsonNode json) throws Exception {
        String room = json.get("room").asText();
        broadcastToRoom(room, "game_over", json);
    }

    private void handleSetNextPlayer(WebSocketSession session, com.fasterxml.jackson.databind.JsonNode json) throws Exception {
        String room = json.get("room").asText();
        String user = json.get("user").asText();
        broadcastToRoom(room, "next_player", user);
    }

    private void handleLeaveRoom(WebSocketSession session) {
        String room = sessionRooms.remove(session.getId());
        String name = sessionUsers.remove(session.getId());
        if (room != null) {
            Set<WebSocketSession> roomSet = roomSessions.get(room);
            if (roomSet != null) {
                roomSet.remove(session);
                if (roomSet.isEmpty()) {
                    roomSessions.remove(room);
                }
            }
            if (name != null) {
                gameService.removeUser(room, name);
            }
            try {
                broadcastToRoom(room, "user_joined", gameService.getUsers(room));
            } catch (Exception e) {
                System.err.println("Error broadcasting after leave: " + e.getMessage());
            }
        }
    }

    private void handleSetupComplete(WebSocketSession session) throws Exception {
        String room = sessionRooms.get(session.getId());
        String name = sessionUsers.get(session.getId());
        if (room == null || name == null) return;

        boolean allDone = gameService.markSetupComplete(room, name);
        if (allDone) {
            gameService.resetSetupComplete(room);
            var firstPlayer = gameService.getRandomPlayer(room);
            broadcastToRoom(room, "game_started", java.util.Map.of("firstPlayer", firstPlayer.getName()));
        }
    }

    private void broadcastToRoom(String room, String type, Object payload) throws Exception {
        broadcastToRoom(room, type, payload, null);
    }

    private void broadcastToRoom(String room, String type, Object payload, WebSocketSession exclude) throws Exception {
        TextMessage msg = new TextMessage(objectMapper.writeValueAsString(
                java.util.Map.of("type", type, "payload", payload)
        ));
        Set<WebSocketSession> roomSet = roomSessions.get(room);
        if (roomSet == null) return;
        for (var s : roomSet) {
            if (s.isOpen() && s != exclude) {
                s.sendMessage(msg);
            }
        }
    }

    private void sendToSession(WebSocketSession session, String type, String message) throws Exception {
        TextMessage msg = new TextMessage(objectMapper.writeValueAsString(
                java.util.Map.of("type", type, "payload", message)
        ));
        if (session.isOpen()) session.sendMessage(msg);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        handleLeaveRoom(session);
        System.out.println("User disconnected: " + session.getId());
    }
}
