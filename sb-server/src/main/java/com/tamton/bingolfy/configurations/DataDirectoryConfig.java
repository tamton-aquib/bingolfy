package com.tamton.bingolfy.configurations;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;

@Configuration
public class DataDirectoryConfig {

    @Bean
    public static BeanFactoryPostProcessor dataDirectoryCreator() {
        return beanFactory -> {
            File dir = new File("./data");
            if (!dir.exists() && !dir.mkdirs()) {
                throw new IllegalStateException("Could not create data directory: " + dir.getAbsolutePath());
            }
        };
    }
}
