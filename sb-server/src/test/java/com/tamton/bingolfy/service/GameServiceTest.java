package com.tamton.bingolfy.service;

import com.tamton.bingolfy.entity.User;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GameServiceTest {

    private static int[][] fullGrid() {
        int[][] grid = new int[5][5];
        int n = 1;
        for (int r = 0; r < 5; r++) {
            for (int c = 0; c < 5; c++) {
                grid[r][c] = n++;
            }
        }
        return grid;
    }

    private static List<String> names(GameService svc, String room) {
        return svc.getUsers(room).stream().map(User::getName).toList();
    }

    private GameService newRoom(String room, String... players) {
        GameService svc = new GameService();
        for (String p : players) {
            var result = svc.joinRoom(room, p, "uid-" + p);
            assertNull(result.error(), "join failed for " + p);
        }
        return svc;
    }

    private void startGame(GameService svc, String room) {
        for (String p : names(svc, room)) {
            svc.setUserReady(room, p);
        }
        assertNotNull(svc.tryStartReadyPhase(room));
        String first = null;
        for (String p : names(svc, room)) {
            svc.storeGrid(room, p, fullGrid());
            first = svc.tryStartGame(room, p);
        }
        assertNotNull(first);
    }

    @Test
    void joinRoomDeduplicatesByUid() {
        GameService svc = newRoom("r", "alice");

        var rejoined = svc.joinRoom("r", "alice", "uid-alice");
        assertNull(rejoined.error());
        assertEquals(1, svc.getUsers("r").size());

        var renamed = svc.joinRoom("r", "alice-2", "uid-alice");
        assertNull(renamed.error());
        assertEquals("alice", renamed.name());
        assertEquals(1, svc.getUsers("r").size());
    }

    @Test
    void joinRoomRejectsDuplicateNameFromOtherUid() {
        GameService svc = newRoom("r", "bob");

        var result = svc.joinRoom("r", "bob", "uid-other");
        assertNotNull(result.error());
        assertTrue(result.error().contains("taken"));
    }

    @Test
    void joinRoomRejectsWhenFull() {
        GameService svc = newRoom("r", "p1", "p2", "p3", "p4", "p5", "p6", "p7");
        assertEquals(7, svc.getUsers("r").size());

        assertNull(svc.joinRoom("r", "p8", "uid-p8").error());
        assertEquals(8, svc.getUsers("r").size());

        var full = svc.joinRoom("r", "p9", "uid-p9");
        assertNotNull(full.error());
        assertTrue(full.error().contains("full"));
    }

    @Test
    void joinRoomRejectsWhenGameInProgress() {
        GameService svc = newRoom("r", "a", "b");
        startGame(svc, "r");

        var result = svc.joinRoom("r", "c", "uid-c");
        assertNotNull(result.error());
        assertTrue(result.error().contains("progress"));

        var rejoin = svc.joinRoom("r", "a", "uid-a");
        assertNull(rejoin.error());
    }

    @Test
    void readyPhaseNeedsTwoPlayers() {
        GameService svc = newRoom("r", "a");

        assertNull(svc.tryStartReadyPhase("r"));

        svc.joinRoom("r", "b", "uid-b");
        assertNull(svc.tryStartReadyPhase("r"));

        svc.setUserReady("r", "a");
        svc.setUserReady("r", "b");
        String first = svc.tryStartReadyPhase("r");

        assertTrue(names(svc, "r").contains(first));
        assertEquals("SETUP", svc.getGamePhase("r"));
    }

    @Test
    void readyFlagsResetAfterStart() {
        GameService svc = newRoom("r", "a", "b");
        svc.setUserReady("r", "a");
        svc.setUserReady("r", "b");
        svc.tryStartReadyPhase("r");

        assertTrue(svc.getUsers("r").stream().noneMatch(User::isReady));
    }

    @Test
    void countsRowsColumnsAndDiagonals() {
        GameService svc = newRoom("r", "a", "b");
        svc.storeGrid("r", "a", fullGrid());

        svc.updateCalledNumbers("r", new int[]{1, 2, 3, 4, 5});
        assertEquals(1, svc.countLines("r", "a"));

        svc.updateCalledNumbers("r", new int[]{7, 13, 19, 25});
        assertEquals(2, svc.countLines("r", "a"));

        svc.updateCalledNumbers("r", new int[]{6, 11, 16, 21});
        assertEquals(3, svc.countLines("r", "a"));
    }

    @Test
    void claimsWinWhenFiveLines() {
        GameService svc = newRoom("r", "a", "b");
        startGame(svc, "r");

        int[] all = new int[25];
        for (int i = 0; i < 25; i++) all[i] = i + 1;
        assertTrue(svc.updateCalledNumbers("r", all));

        assertEquals(12, svc.tryClaimWin("r", "a"));
        assertEquals("FINISHED", svc.getGamePhase("r"));
        assertEquals("a", svc.getWinner("r"));
        assertEquals(-1, svc.tryClaimWin("r", "b"));
    }

    @Test
    void returnsStoredGrid() {
        GameService svc = newRoom("r", "a", "b");
        startGame(svc, "r");

        assertEquals(5, svc.getGrid("r", "a").length);
        assertEquals(5, svc.getGrid("r", "a")[0].length);
        assertNull(svc.getGrid("r", "unknown"));

        svc.resetGameForRoom("r");
        assertEquals(1, svc.getGrid("r", "a")[0][0]);
    }

    @Test
    void rejectsWinWithNotEnoughLines() {
        GameService svc = newRoom("r", "a", "b");
        startGame(svc, "r");

        svc.updateCalledNumbers("r", new int[]{1, 2, 3, 4, 5});
        assertEquals(1, svc.tryClaimWin("r", "a"));
        assertEquals("PLAYING", svc.getGamePhase("r"));
    }

    @Test
    void advancesTurnInJoinOrder() {
        GameService svc = newRoom("r", "a", "b", "c");
        startGame(svc, "r");

        String cur = svc.getCurrentPlayer("r");
        String expected = names(svc, "r").get((names(svc, "r").indexOf(cur) + 1) % 3);

        assertEquals(expected, svc.advanceToNextPlayer("r"));
    }

    @Test
    void leavingCurrentPlayerAdvancesTurn() {
        GameService svc = newRoom("r", "a", "b", "c");
        startGame(svc, "r");

        String cur = svc.getCurrentPlayer("r");
        var outcome = svc.removeUser("r", cur);

        assertFalse(outcome.aborted());
        assertNotNull(outcome.nextPlayer());
        assertFalse(outcome.nextPlayer().equals(cur));
    }

    @Test
    void leavingMidGameWithTwoPlayersAborts() {
        GameService svc = newRoom("r", "a", "b");
        startGame(svc, "r");

        var outcome = svc.removeUser("r", "a");

        assertTrue(outcome.aborted());
        assertEquals("players", outcome.reason());
        assertEquals("FINISHED", svc.getGamePhase("r"));
    }

    @Test
    void leavingDuringSetupCancelsSetup() {
        GameService svc = newRoom("r", "a", "b");
        svc.setUserReady("r", "a");
        svc.setUserReady("r", "b");
        svc.tryStartReadyPhase("r");
        assertEquals("SETUP", svc.getGamePhase("r"));

        var outcome = svc.removeUser("r", "a");

        assertTrue(outcome.aborted());
        assertEquals("setup", outcome.reason());
        assertNull(svc.getGamePhase("r"));

        assertNull(svc.joinRoom("r", "c", "uid-c").error());
    }

    @Test
    void lastPlayerLeavingRemovesRoom() {
        GameService svc = newRoom("r", "a");
        svc.removeUser("r", "a");

        assertTrue(svc.getUsers("r").isEmpty());
        assertNull(svc.joinRoom("r", "b", "uid-b").error());
    }

    @Test
    void resetGameKeepsGridsAndRestarts() {
        GameService svc = newRoom("r", "a", "b");
        startGame(svc, "r");

        svc.updateCalledNumbers("r", new int[]{1, 2, 3});
        svc.resetGameForRoom("r");

        assertEquals("PLAYING", svc.getGamePhase("r"));
        assertTrue(svc.getCalledNumbers("r").isEmpty());
        assertNotNull(svc.getCurrentPlayer("r"));
    }
}
