package com.tamton.bingolfy.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "leaderboard")
public class LeaderboardEntry {

    @Id
    private String uid;

    private String displayName;
    private int wins;
    private int gamesPlayed;
    private LocalDateTime lastPlayedAt;

    public LeaderboardEntry() {}

    public LeaderboardEntry(String uid, String displayName) {
        this.uid = uid;
        this.displayName = displayName;
        this.wins = 0;
        this.gamesPlayed = 0;
        this.lastPlayedAt = LocalDateTime.now();
    }

    public String getUid() { return uid; }
    public void setUid(String uid) { this.uid = uid; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public int getWins() { return wins; }
    public void setWins(int wins) { this.wins = wins; }

    public int getGamesPlayed() { return gamesPlayed; }
    public void setGamesPlayed(int gamesPlayed) { this.gamesPlayed = gamesPlayed; }

    public LocalDateTime getLastPlayedAt() { return lastPlayedAt; }
    public void setLastPlayedAt(LocalDateTime lastPlayedAt) { this.lastPlayedAt = lastPlayedAt; }
}
