package com.insectopia.services;

import java.time.Clock;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.repository.TokenRevocadoRepository;

@Service
public class RevokedTokenCleanup {
    private final TokenRevocadoRepository revoked;
    private final Clock clock;

    @Autowired
    public RevokedTokenCleanup(TokenRevocadoRepository revoked) {
        this(revoked, Clock.systemUTC());
    }

    RevokedTokenCleanup(TokenRevocadoRepository revoked, Clock clock) {
        this.revoked = revoked;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.jwt.revocation-cleanup-delay-ms:3600000}")
    @Transactional
    public void deleteExpired() {
        revoked.deleteByFechaExpiracionBefore(LocalDateTime.now(clock));
    }
}
