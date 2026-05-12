package com.tamton.bingolfy.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/test")
    public String test() {
        System.out.println("Something");
        System.out.println("No way");
        return "test";
    }

}
