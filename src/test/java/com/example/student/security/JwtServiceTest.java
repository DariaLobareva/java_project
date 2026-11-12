package com.example.student.security;

import com.example.student.model.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService();

    private UserDetails userDetails(String email) {
        return org.springframework.security.core.userdetails.User
                .withUsername(email).password("x").roles("ADMIN").build();
    }

    @Test
    void generatedToken_containsUsername() {
        String token = jwtService.generateToken("admin@example.com", Set.of(Role.ADMIN));

        assertThat(jwtService.extractUsername(token)).isEqualTo("admin@example.com");
    }

    @Test
    void generatedToken_containsRoles() {
        String token = jwtService.generateToken("s@example.com", Set.of(Role.SUPER_ADMIN, Role.ADMIN));

        assertThat(jwtService.extractRoles(token)).containsExactlyInAnyOrder(Role.SUPER_ADMIN, Role.ADMIN);
    }

    @Test
    void validateToken_sameUser_true() {
        String token = jwtService.generateToken("admin@example.com", Set.of(Role.ADMIN));

        assertThat(jwtService.validateToken(token, userDetails("admin@example.com"))).isTrue();
    }

    @Test
    void validateToken_otherUser_false() {
        String token = jwtService.generateToken("admin@example.com", Set.of(Role.ADMIN));

        assertThat(jwtService.validateToken(token, userDetails("teacher@example.com"))).isFalse();
    }

    @Test
    void tamperedToken_isRejected() {
        String token = jwtService.generateToken("admin@example.com", Set.of(Role.ADMIN));
        String[] parts = token.split("\\.");
        String fakePayload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"hacker@example.com\"}".getBytes());
        String tampered = parts[0] + "." + fakePayload + "." + parts[2];

        assertThatThrownBy(() -> jwtService.extractUsername(tampered)).isInstanceOf(Exception.class);
    }
}

