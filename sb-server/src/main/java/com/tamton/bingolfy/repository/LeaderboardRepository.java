package com.tamton.bingolfy.repository;

import com.tamton.bingolfy.entity.LeaderboardEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LeaderboardRepository extends JpaRepository<LeaderboardEntry, String> {
    List<LeaderboardEntry> findAllByOrderByWinsDesc();
    List<LeaderboardEntry> findTop5ByOrderByWinsDesc();
}
