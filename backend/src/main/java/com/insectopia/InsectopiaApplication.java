package com.insectopia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class InsectopiaApplication {

	public static void main(String[] args) {
		SpringApplication.run(InsectopiaApplication.class, args);
	}

}
