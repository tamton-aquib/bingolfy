package com.tamton.bingolfy.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("dev")
public class TestController {

    @GetMapping("/test")
    public String test() {
        return "test";
    }

}
