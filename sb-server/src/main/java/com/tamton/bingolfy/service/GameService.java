package com.tamton.bingolfy.service;

import org.springframework.stereotype.Service;

import com.tamton.bingolfy.entity.User;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {

    private final Map<String, List<User>> rooms = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> setupComplete = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public synchronized List<User> joinRoom(String room, String name) {
        List<User> users = rooms.computeIfAbsent(room, k -> new ArrayList<>());
        User existing = users.stream()
                .filter(u -> u.getName().equals(name))
                .findFirst()
                .orElse(null);
        if (existing == null) {
            users.add(new User(name));
        }
        return List.copyOf(users);
    }

    public synchronized void setUserReady(String room, String name) {
        List<User> users = rooms.get(room);
        if (users == null) return;
        users.stream()
                .filter(u -> u.getName().equals(name))
                .findFirst()
                .ifPresent(u -> u.setReady(true));
    }

    public synchronized void resetAllReady(String room) {
        List<User> users = rooms.get(room);
        if (users != null) {
            users.forEach(u -> u.setReady(false));
        }
    }

    public synchronized boolean allReady(String room) {
        List<User> users = rooms.get(room);
        return users != null && !users.isEmpty() && users.stream().allMatch(User::isReady);
    }

    public synchronized User getRandomPlayer(String room) {
        List<User> users = rooms.get(room);
        return users.get(random.nextInt(users.size()));
    }

    public synchronized List<User> getUsers(String room) {
        List<User> users = rooms.get(room);
        return users == null ? List.of() : List.copyOf(users);
    }

    public synchronized void removeUser(String room, String name) {
        List<User> users = rooms.get(room);
        if (users != null) {
            users.removeIf(u -> u.getName().equals(name));
            if (users.isEmpty()) {
                rooms.remove(room);
                setupComplete.remove(room);
            }
        }
    }

    public synchronized boolean markSetupComplete(String room, String name) {
        setupComplete.computeIfAbsent(room, k -> ConcurrentHashMap.newKeySet()).add(name);
        List<User> users = rooms.get(room);
        if (users == null) return false;
        Set<String> done = setupComplete.get(room);
        return users.stream().allMatch(u -> done.contains(u.getName()));
    }

    public synchronized void resetSetupComplete(String room) {
        setupComplete.remove(room);
    }

    public synchronized int getUserCount(String room) {
        List<User> users = rooms.get(room);
        return users == null ? 0 : users.size();
    }

    public synchronized List<Map<String, Object>> getRoomList() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (var entry : rooms.entrySet()) {
            list.add(Map.of(
                    "name", entry.getKey(),
                    "playerCount", entry.getValue().size(),
                    "maxPlayers", 8
            ));
        }
        return list;
    }
}
