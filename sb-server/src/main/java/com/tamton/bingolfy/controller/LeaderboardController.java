package com.tamton.bingolfy.controller;

import com.tamton.bingolfy.entity.LeaderboardEntry;
import com.tamton.bingolfy.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping
    public List<Map<String, Object>> getLeaderboard(@RequestParam(defaultValue = "10") int limit) {
        return leaderboardService.getTopEntries(limit).stream()
                .map(e -> Map.<String, Object>of(
                        "uid", e.getUid(),
                        "displayName", e.getDisplayName(),
                        "wins", e.getWins(),
                        "gamesPlayed", e.getGamesPlayed(),
                        "winRate", e.getGamesPlayed() > 0 ? Math.round(e.getWins() * 100.0 / e.getGamesPlayed()) : 0
                ))
                .toList();
    }
}
