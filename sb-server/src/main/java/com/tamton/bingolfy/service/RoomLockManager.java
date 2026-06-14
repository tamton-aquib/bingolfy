package com.tamton.bingolfy.service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

public class RoomLockManager {
    private final ConcurrentHashMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public ReentrantLock getLock(String room) {
        return locks.computeIfAbsent(room, k -> new ReentrantLock());
    }

    public void removeLock(String room) {
        locks.remove(room);
    }
}
