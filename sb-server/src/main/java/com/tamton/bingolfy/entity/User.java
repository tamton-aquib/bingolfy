package com.tamton.bingolfy.entity;

public class User {
    private String name;
    private String uid;
    private volatile boolean ready;

    public User(String name, String uid) {
        this.name = name;
        this.uid = uid;
    }

    public void setReady(boolean ready) {
        this.ready = ready;
    }

    public boolean isReady() {
        return ready;
    }

    public String getName() {
        return name;
    }

    public String getUid() {
        return uid;
    }
}
