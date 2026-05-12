package com.tamton.bingolfy;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class BingolfyApplicationTests {

	@Test
	void contextLoads() {
        assertNotNull("someval");
	}

}
