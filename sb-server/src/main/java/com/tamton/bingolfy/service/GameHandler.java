package com.tamton.bingolfy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import org.springframework.beans.factory.annotation.Value;


@Component
@RequiredArgsConstructor
public class GameHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GameHandler.class);
    private static final Set<String> VALID_TYPES = Set.of(
            "join_room", "user_ready", "tile_clicked", "user_won",
            "leave_room", "setup_complete", "request_state", "reset_game"
    );

    private final ObjectMapper objectMapper;
    private final GameService gameService;
    private final LeaderboardService leaderboardService;

    @Value("${bingo.turn-timeout:60}")
    private long turnTimeoutSeconds;

    private final ScheduledExecutorService turnChecker =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "turn-timeout-checker");
                t.setDaemon(true);
                return t;
            });

    private final Map<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionRooms = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUsers = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUid = new ConcurrentHashMap<>();

    @PostConstruct
    public void startTurnChecker() {
        turnChecker.scheduleAtFixedRate(this::checkTurnTimeouts, 5, 2, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void stopTurnChecker() {
        turnChecker.shutdownNow();
    }

    private void checkTurnTimeouts() {
        for (String room : gameService.getActiveRooms()) {
            try {
                String next = gameService.checkTurnTimeout(room, turnTimeoutSeconds * 1000);
                if (next != null) {
                    broadcastToRoom(room, "turn_timeout", Map.of("nextPlayer", next));
                    broadcastToRoom(room, "next_player", next);
                }
            } catch (Exception e) {
                log.error("Turn timeout check failed for room {}", room, e);
            }
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("User connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            var jsonNode = objectMapper.readTree(message.getPayload());
            var typeNode = jsonNode.get("type");
            if (typeNode == null || !typeNode.isTextual()) {
                sendToSession(session, "error", "Missing or invalid 'type' field");
                return;
            }
            String type = typeNode.asText();
            if (!VALID_TYPES.contains(type)) {
                sendToSession(session, "error", "Unknown message type: " + type);
                return;
            }

            switch (type) {
                case "join_room" -> handleJoinRoom(session, jsonNode);
                case "user_ready" -> handleUserReady(session);
                case "tile_clicked" -> handleTileClicked(session, jsonNode);
                case "user_won" -> handleUserWon(session);
                case "leave_room" -> handleLeaveRoom(session);
                case "setup_complete" -> handleSetupComplete(session, jsonNode);
                case "request_state" -> handleRequestState(session);
                case "reset_game" -> handleResetGame(session);
            }
        } catch (Exception e) {
            log.error("Error handling message from {}: {}", session.getId(), e.getMessage(), e);
            try {
                sendToSession(session, "error", "Invalid message");
            } catch (Exception ignored) {}
        }
    }

    private void handleJoinRoom(WebSocketSession session, JsonNode json) throws Exception {
        var roomNode = json.get("room");
        var nameNode = json.get("name");
        if (roomNode == null || !roomNode.isTextual() || nameNode == null || !nameNode.isTextual()) {
            sendToSession(session, "error", "Missing room or name");
            return;
        }

        String room = roomNode.asText().trim();
        String name = nameNode.asText().trim();
        String uid = json.has("uid") && json.get("uid").isTextual() ? json.get("uid").asText().trim() : null;

        if (room.isEmpty() || room.length() > 50 || name.isEmpty() || name.length() > 30) {
            sendToSession(session, "error", "Invalid room or name length");
            return;
        }
        if (room.matches(".*[\\x00-\\x1f\\\\/<>&].*") || name.matches(".*[\\x00-\\x1f\\\\/<>&].*")) {
            sendToSession(session, "error", "Invalid characters in room or name");
            return;
        }

        String prevRoom = sessionRooms.get(session.getId());
        if (prevRoom != null) {
            handleLeaveRoom(session);
        }

        var result = gameService.joinRoom(room, name, uid);
        if (result.error() != null) {
            sendToSession(session, "error", result.error());
            return;
        }

        roomSessions.computeIfAbsent(room, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionRooms.put(session.getId(), room);
        sessionUsers.put(session.getId(), result.name());
        if (uid != null && !uid.isEmpty()) {
            sessionUid.put(session.getId(), uid);
        }

        broadcastToRoom(room, "user_joined", result.users());
    }

    private void handleUserReady(WebSocketSession session) throws Exception {
        String room = sessionRooms.get(session.getId());
        String user = sessionUsers.get(session.getId());
        if (room == null || user == null) return;

        gameService.setUserReady(room, user);
        broadcastToRoom(room, "user_joined", gameService.getUsers(room));

        String firstPlayer = gameService.tryStartReadyPhase(room);
        if (firstPlayer != null) {
            broadcastToRoom(room, "all_ready", Map.of("firstPlayer", firstPlayer));
        }
    }

    private void handleTileClicked(WebSocketSession session, JsonNode json) throws Exception {
        String room = sessionRooms.get(session.getId());
        String name = sessionUsers.get(session.getId());
        if (room == null || name == null) return;

        if (!gameService.isPlayersTurn(room, name)) {
            sendToSession(session, "error", "Not your turn or game not active");
            return;
        }

        var tilesNode = json.get("tiles");
        if (tilesNode == null || !tilesNode.isArray()) {
            sendToSession(session, "error", "Missing or invalid tiles");
            return;
        }

        int[] tiles = objectMapper.treeToValue(tilesNode, int[].class);
        if (tiles.length > 25) {
            sendToSession(session, "error", "Too many tiles");
            return;
        }

        if (!gameService.updateCalledNumbers(room, tiles)) {
            sendToSession(session, "error", "Invalid tiles");
            return;
        }

        Set<Integer> called = gameService.getCalledNumbers(room);
        broadcastToRoom(room, "flush", called);

        String next = gameService.advanceToNextPlayer(room);
        if (next != null) {
            broadcastToRoom(room, "next_player", next);
        }
    }

    private void handleUserWon(WebSocketSession session) throws Exception {
        String room = sessionRooms.get(session.getId());
        String name = sessionUsers.get(session.getId());
        if (room == null || name == null) return;

        int lines = gameService.tryClaimWin(room, name);
        if (lines >= 5) {
            String winnerUid = sessionUid.get(session.getId());
            var users = gameService.getUsers(room);
            List<String> allUids = new ArrayList<>();
            List<String> allNames = new ArrayList<>();
            for (var u : users) {
                allUids.add(u.getUid());
                allNames.add(u.getName());
            }
            if (winnerUid != null && !winnerUid.isEmpty()) {
                try {
                    leaderboardService.recordGame(winnerUid, name, allUids, allNames);
                } catch (Exception e) {
                    log.error("Failed to record leaderboard stats: {}", e.getMessage());
                }
            }
            broadcastToRoom(room, "game_over", Map.of("user", name));
        } else if (lines >= 0) {
            sendToSession(session, "win_rejected", "Not enough lines");
        }
    }

    private void handleLeaveRoom(WebSocketSession session) {
        String room = sessionRooms.remove(session.getId());
        String name = sessionUsers.remove(session.getId());
        sessionUid.remove(session.getId());
        if (room != null) {
            Set<WebSocketSession> roomSet = roomSessions.get(room);
            if (roomSet != null) {
                roomSet.remove(session);
                if (roomSet.isEmpty()) {
                    roomSessions.remove(room);
                }
            }
            if (name != null) {
                var outcome = gameService.removeUser(room, name);
                try {
                    if (outcome.aborted()) {
                        broadcastToRoom(room, "game_aborted", Map.of("reason", outcome.reason()));
                    } else {
                        broadcastToRoom(room, "user_left", Map.of("user", name));
                        if (outcome.nextPlayer() != null) {
                            broadcastToRoom(room, "next_player", outcome.nextPlayer());
                        }
                        broadcastToRoom(room, "user_joined", outcome.users());
                    }
                } catch (Exception e) {
                    log.error("Error broadcasting after leave: {}", e.getMessage());
                }
            }
        }
    }

    private void handleSetupComplete(WebSocketSession session, JsonNode json) throws Exception {
        String room = sessionRooms.get(session.getId());
        String name = sessionUsers.get(session.getId());
        if (room == null || name == null) return;

        var gridNode = json.get("grid");
        if (gridNode == null || !gridNode.isArray() || gridNode.size() != 5) {
            sendToSession(session, "error", "Missing or invalid grid");
            return;
        }

        int[][] grid = new int[5][5];
        boolean[] seen = new boolean[26]; // 1-25
        for (int r = 0; r < 5; r++) {
            var row = gridNode.get(r);
            if (!row.isArray() || row.size() != 5) {
                sendToSession(session, "error", "Invalid grid row");
                return;
            }
            for (int c = 0; c < 5; c++) {
                int val = row.get(c).asInt();
                if (val < 1 || val > 25 || seen[val]) {
                    sendToSession(session, "error", "Invalid grid value");
                    return;
                }
                seen[val] = true;
                grid[r][c] = val;
            }
        }

        gameService.storeGrid(room, name, grid);

        String firstPlayer = gameService.tryStartGame(room, name);
        if (firstPlayer != null) {
            broadcastToRoom(room, "game_started", Map.of("firstPlayer", firstPlayer));
        }
    }

    private void handleRequestState(WebSocketSession session) throws Exception {
        String room = sessionRooms.get(session.getId());
        String name = sessionUsers.get(session.getId());
        if (room == null || name == null) return;

        String phase = gameService.getGamePhase(room);
        Set<Integer> called = gameService.getCalledNumbers(room);
        String current = gameService.getCurrentPlayer(room);
        int lines = gameService.countLines(room, name);

        sendToSession(session, "game_state", Map.of(
                "phase", phase != null ? phase : "WAITING",
                "calledNumbers", called,
                "currentPlayer", current != null ? current : "",
                "lines", lines
        ));
    }

    private void handleResetGame(WebSocketSession session) throws Exception {
        String room = sessionRooms.get(session.getId());
        if (room == null) return;
        gameService.resetGameForRoom(room);
        String first = gameService.getCurrentPlayer(room);
        broadcastToRoom(room, "game_reset", Map.of("firstPlayer", first));
    }

    private void broadcastToRoom(String room, String type, Object payload) throws Exception {
        broadcastToRoom(room, type, payload, null);
    }

    private void broadcastToRoom(String room, String type, Object payload, WebSocketSession exclude) throws Exception {
        TextMessage msg = new TextMessage(objectMapper.writeValueAsString(
                Map.of("type", type, "payload", payload)
        ));
        Set<WebSocketSession> roomSet = roomSessions.get(room);
        if (roomSet == null) return;
        for (var s : roomSet) {
            if (s.isOpen() && s != exclude) {
                s.sendMessage(msg);
            }
        }
    }

    private void sendToSession(WebSocketSession session, String type, Object payload) throws Exception {
        TextMessage msg = new TextMessage(objectMapper.writeValueAsString(
                Map.of("type", type, "payload", payload)
        ));
        if (session.isOpen()) session.sendMessage(msg);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        handleLeaveRoom(session);
        log.info("User disconnected: {}", session.getId());
    }
}
