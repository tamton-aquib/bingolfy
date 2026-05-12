package com.tamton.bingolfy.entity;

public class User {
    private String name;
    private boolean ready;

    public User(String name) {
        this.name = name;
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
}
