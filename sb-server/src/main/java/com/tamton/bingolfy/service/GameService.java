package com.tamton.bingolfy.service;

import org.springframework.stereotype.Service;

import com.tamton.bingolfy.entity.User;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class GameService {

    private static final int MAX_PLAYERS = 8;

    private final Map<String, List<User>> rooms = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> setupComplete = new ConcurrentHashMap<>();
    private final Map<String, Map<String, int[][]>> playerGrids = new ConcurrentHashMap<>();
    private final Map<String, Set<Integer>> calledNumbers = new ConcurrentHashMap<>();
    private final Map<String, String> currentPlayer = new ConcurrentHashMap<>();
    private final Map<String, String> gamePhase = new ConcurrentHashMap<>();
    private final Map<String, Long> lastMoveAt = new ConcurrentHashMap<>();
    private final Map<String, String> winner = new ConcurrentHashMap<>();
    private final RoomLockManager lockManager = new RoomLockManager();
    private final Random random = new Random();

    public record LeaveOutcome(List<User> users, boolean aborted, String nextPlayer, String reason) {}

    public record JoinResult(List<User> users, String name, String error) {}

    public JoinResult joinRoom(String room, String name, String uid) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            List<User> users = rooms.computeIfAbsent(room, k -> new ArrayList<>());
            boolean hasUid = uid != null && !uid.isEmpty();
            User existing = users.stream()
                    .filter(u -> hasUid ? uid.equals(u.getUid()) : u.getName().equals(name))
                    .findFirst()
                    .orElse(null);
            if (existing != null) {
                return new JoinResult(List.copyOf(users), existing.getName(), null);
            }
            String phase = gamePhase.get(room);
            if ("SETUP".equals(phase) || "PLAYING".equals(phase)) {
                return new JoinResult(null, null, "Game already in progress");
            }
            if ("FINISHED".equals(phase)) {
                return new JoinResult(null, null, "Game finished");
            }
            if (users.stream().anyMatch(u -> u.getName().equals(name))) {
                return new JoinResult(null, null, "Name already taken — pick a different one");
            }
            if (users.size() >= MAX_PLAYERS) {
                return new JoinResult(null, null, "Room is full");
            }
            users.add(new User(name, uid));
            return new JoinResult(List.copyOf(users), name, null);
        } finally {
            lock.unlock();
        }
    }

    public void setUserReady(String room, String name) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            List<User> users = rooms.get(room);
            if (users == null) return;
            users.stream()
                    .filter(u -> u.getName().equals(name))
                    .findFirst()
                    .ifPresent(u -> u.setReady(true));
        } finally {
            lock.unlock();
        }
    }

    public String tryStartReadyPhase(String room) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            List<User> users = rooms.get(room);
            if (users == null || users.size() < 2) return null;
            if (!users.stream().allMatch(User::isReady)) return null;
            users.forEach(u -> u.setReady(false));
            gamePhase.put(room, "SETUP");
            User first = users.get(random.nextInt(users.size()));
            return first.getName();
        } finally {
            lock.unlock();
        }
    }

    public User getRandomPlayer(String room) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            List<User> users = rooms.get(room);
            if (users == null || users.isEmpty()) return null;
            return users.get(random.nextInt(users.size()));
        } finally {
            lock.unlock();
        }
    }

    public List<User> getUsers(String room) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            List<User> users = rooms.get(room);
            return users == null ? List.of() : List.copyOf(users);
        } finally {
            lock.unlock();
        }
    }

    public LeaveOutcome removeUser(String room, String name) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            List<User> users = rooms.get(room);
            if (users == null) return new LeaveOutcome(List.of(), false, null, null);
            users.removeIf(u -> u.getName().equals(name));
            if (users.isEmpty()) {
                rooms.remove(room);
                setupComplete.remove(room);
                cleanupRoomStateInternal(room);
                lockManager.removeLock(room);
                return new LeaveOutcome(List.of(), false, null, null);
            }
            String phase = gamePhase.get(room);
            if ("SETUP".equals(phase)) {
                gamePhase.remove(room);
                setupComplete.remove(room);
                return new LeaveOutcome(List.copyOf(users), true, null, "setup");
            }
            if ("PLAYING".equals(phase)) {
                if (users.size() < 2) {
                    gamePhase.put(room, "FINISHED");
                    return new LeaveOutcome(List.copyOf(users), true, null, "players");
                }
                if (name.equals(currentPlayer.get(room))) {
                    return new LeaveOutcome(List.copyOf(users), false, advanceToNextPlayerInternal(room), null);
                }
            }
            return new LeaveOutcome(List.copyOf(users), false, null, null);
        } finally {
            lock.unlock();
        }
    }

    public List<Map<String, Object>> getRoomList() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (var entry : rooms.entrySet()) {
            String phase = gamePhase.get(entry.getKey());
            if ("SETUP".equals(phase) || "PLAYING".equals(phase) || "FINISHED".equals(phase)) {
                continue;
            }
            list.add(Map.of(
                    "name", entry.getKey(),
                    "playerCount", entry.getValue().size(),
                    "maxPlayers", MAX_PLAYERS
            ));
        }
        return list;
    }

    // --- Phase 1: Game state tracking ---

    public void storeGrid(String room, String name, int[][] grid) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            playerGrids.computeIfAbsent(room, k -> new ConcurrentHashMap<>()).put(name, grid);
        } finally {
            lock.unlock();
        }
    }

    public boolean updateCalledNumbers(String room, int[] newTiles) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            Set<Integer> called = calledNumbers.computeIfAbsent(room, k -> ConcurrentHashMap.newKeySet());
            for (int t : newTiles) {
                if (t < 1 || t > 25) return false;
                if (!called.add(t)) return false;
            }
            lastMoveAt.put(room, System.currentTimeMillis());
            return true;
        } finally {
            lock.unlock();
        }
    }

    public Set<Integer> getCalledNumbers(String room) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            Set<Integer> called = calledNumbers.get(room);
            return called == null ? Set.of() : Set.copyOf(called);
        } finally {
            lock.unlock();
        }
    }

    public int countLines(String room, String name) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            return countLinesInternal(room, name);
        } finally {
            lock.unlock();
        }
    }

    private int countLinesInternal(String room, String name) {
        Map<String, int[][]> grids = playerGrids.get(room);
        if (grids == null) return 0;
        int[][] grid = grids.get(name);
        if (grid == null) return 0;
        Set<Integer> called = calledNumbers.get(room);
        if (called == null) return 0;

        int lines = 0;
        for (int r = 0; r < 5; r++) {
            boolean all = true;
            for (int c = 0; c < 5; c++) {
                if (!called.contains(grid[r][c])) { all = false; break; }
            }
            if (all) lines++;
        }
        for (int c = 0; c < 5; c++) {
            boolean all = true;
            for (int r = 0; r < 5; r++) {
                if (!called.contains(grid[r][c])) { all = false; break; }
            }
            if (all) lines++;
        }
        boolean d1 = true, d2 = true;
        for (int i = 0; i < 5; i++) {
            if (!called.contains(grid[i][i])) d1 = false;
            if (!called.contains(grid[i][4 - i])) d2 = false;
        }
        if (d1) lines++;
        if (d2) lines++;
        return lines;
    }

    public String getCurrentPlayer(String room) {
        return currentPlayer.get(room);
    }

    public String getGamePhase(String room) {
        return gamePhase.get(room);
    }

    public int[][] getGrid(String room, String name) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            Map<String, int[][]> grids = playerGrids.get(room);
            return grids == null ? null : grids.get(name);
        } finally {
            lock.unlock();
        }
    }

    public String getWinner(String room) {
        return winner.get(room);
    }

    // --- Phase 2: Atomic compound operations ---

    public boolean isPlayersTurn(String room, String name) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            return "PLAYING".equals(gamePhase.get(room)) && name.equals(currentPlayer.get(room));
        } finally {
            lock.unlock();
        }
    }

    public boolean isGameActive(String room) {
        return "PLAYING".equals(gamePhase.get(room));
    }

    public int tryClaimWin(String room, String name) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            if (!"PLAYING".equals(gamePhase.get(room))) return -1;
            int lines = countLinesInternal(room, name);
            if (lines >= 5) {
                gamePhase.put(room, "FINISHED");
                winner.put(room, name);
            }
            return lines;
        } finally {
            lock.unlock();
        }
    }

    public String advanceToNextPlayer(String room) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            return advanceToNextPlayerInternal(room);
        } finally {
            lock.unlock();
        }
    }

    private String advanceToNextPlayerInternal(String room) {
        if (!"PLAYING".equals(gamePhase.get(room))) return null;
        List<User> users = rooms.get(room);
        if (users == null || users.isEmpty()) return null;
        String cur = currentPlayer.get(room);
        int idx = 0;
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).getName().equals(cur)) {
                idx = i;
                break;
            }
        }
        String next = users.get((idx + 1) % users.size()).getName();
        currentPlayer.put(room, next);
        lastMoveAt.put(room, System.currentTimeMillis());
        return next;
    }

    public String checkTurnTimeout(String room, long timeoutMillis) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            if (!"PLAYING".equals(gamePhase.get(room))) return null;
            Long last = lastMoveAt.get(room);
            if (last == null || System.currentTimeMillis() - last < timeoutMillis) return null;
            return advanceToNextPlayerInternal(room);
        } finally {
            lock.unlock();
        }
    }

    public List<String> getActiveRooms() {
        List<String> active = new ArrayList<>();
        for (var e : gamePhase.entrySet()) {
            if ("PLAYING".equals(e.getValue())) active.add(e.getKey());
        }
        return active;
    }

    public void resetGameForRoom(String room) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            calledNumbers.remove(room);
            lastMoveAt.put(room, System.currentTimeMillis());
            winner.remove(room);
            gamePhase.put(room, "PLAYING");
            List<User> users = rooms.get(room);
            if (users != null && !users.isEmpty()) {
                currentPlayer.put(room, users.get(random.nextInt(users.size())).getName());
            }
        } finally {
            lock.unlock();
        }
    }

    // --- Phase 2: Atomic compound operations ---

    public String tryStartGame(String room, String name) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            setupComplete.computeIfAbsent(room, k -> ConcurrentHashMap.newKeySet()).add(name);
            List<User> users = rooms.get(room);
            if (users == null) return null;
            Set<String> done = setupComplete.get(room);
            if (!users.stream().allMatch(u -> done.contains(u.getName()))) return null;
            setupComplete.remove(room);
            List<User> usersForPick = rooms.get(room);
            if (usersForPick == null || usersForPick.isEmpty()) return null;
            User first = usersForPick.get(random.nextInt(usersForPick.size()));
            currentPlayer.put(room, first.getName());
            gamePhase.put(room, "PLAYING");
            return first.getName();
        } finally {
            lock.unlock();
        }
    }

    public void cleanupRoomState(String room) {
        ReentrantLock lock = lockManager.getLock(room);
        lock.lock();
        try {
            cleanupRoomStateInternal(room);
        } finally {
            lock.unlock();
        }
    }

    private void cleanupRoomStateInternal(String room) {
        playerGrids.remove(room);
        calledNumbers.remove(room);
        currentPlayer.remove(room);
        gamePhase.remove(room);
        lastMoveAt.remove(room);
        winner.remove(room);
    }
}
