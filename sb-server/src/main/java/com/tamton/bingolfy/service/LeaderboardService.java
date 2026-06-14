package com.tamton.bingolfy.service;

import com.tamton.bingolfy.entity.LeaderboardEntry;
import com.tamton.bingolfy.repository.LeaderboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final LeaderboardRepository repository;

    public void recordGame(String winnerUid, String winnerName, List<String> allUids, List<String> allNames) {
        for (int i = 0; i < allUids.size(); i++) {
            String uid = allUids.get(i);
            if (uid == null || uid.isEmpty()) continue;
            String name = allNames.get(i);
            LeaderboardEntry entry = repository.findById(uid).orElseGet(() -> new LeaderboardEntry(uid, name));
            entry.setDisplayName(name);
            entry.setGamesPlayed(entry.getGamesPlayed() + 1);
            if (uid.equals(winnerUid)) {
                entry.setWins(entry.getWins() + 1);
            }
            entry.setLastPlayedAt(LocalDateTime.now());
            repository.save(entry);
        }
    }

    public List<LeaderboardEntry> getTopEntries(int limit) {
        if (limit <= 5) {
            return repository.findTop5ByOrderByWinsDesc();
        }
        return repository.findAllByOrderByWinsDesc();
    }
}
