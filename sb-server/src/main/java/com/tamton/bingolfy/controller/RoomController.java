package com.tamton.bingolfy.controller;

import com.tamton.bingolfy.service.GameService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;


@RestController
@RequiredArgsConstructor
public class RoomController {

    private final GameService gameService;

    @GetMapping("/api/rooms")
    public List<Map<String, Object>> listRooms() {
        return gameService.getRoomList();
    }
}
