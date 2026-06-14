package com.tamton.bingolfy.configurations;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import java.io.File;

@Configuration
public class DataDirectoryConfig {

    @PostConstruct
    public void ensureDataDirectory() {
        File dir = new File("./data");
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }
}
