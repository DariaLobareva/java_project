package com.example.student.service;

import com.example.student.dto.user.UserRequest;
import com.example.student.dto.user.UserResponse;
import com.example.student.dto.user.UserResponseList;
import com.example.student.exception.EmailAlreadyExistsException;
import com.example.student.exception.EntityNotFoundException;
import com.example.student.mapper.UserMapperImpl;
import com.example.student.model.Role;
import com.example.student.model.User;
import com.example.student.repository.UserRepository;
import com.example.student.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository, new UserMapperImpl(), passwordEncoder);
    }

    private User user(long id, String email, Role... roles) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setPassword("hashed-old");
        u.setRoles(new HashSet<>(Set.of(roles)));
        return u;
    }

    @Test
    void findAll_returnsUsersWithCount() {
        when(userRepository.findAll()).thenReturn(List.of(
                user(1, "a@example.com", Role.ADMIN), user(2, "t@example.com", Role.TEACHER)));

        UserResponseList result = userService.findAll();

        assertThat(result.getTotalCount()).isEqualTo(2);
        assertThat(result.getResponses()).extracting(UserResponse::getEmail)
                .containsExactly("a@example.com", "t@example.com");
    }

    @Test
    void save_newEmail_encodesPasswordAndSaves() {
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret1")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(7L);
            return u;
        });

        UserResponse result = userService.save(
                new UserRequest("new@example.com", "secret1", Set.of(Role.TEACHER)));

        assertThat(result.getId()).isEqualTo(7L);
        assertThat(result.getRoles()).containsExactly(Role.TEACHER);
        verify(passwordEncoder).encode("secret1");
    }

    @Test
    void save_existingEmail_throws() {
        when(userRepository.existsByEmail("admin@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.save(
                new UserRequest("admin@example.com", "x", Set.of(Role.ADMIN))))
                .isInstanceOf(EmailAlreadyExistsException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUser_changesEmailRolesAndPassword() {
        User existing = user(1, "old@example.com", Role.TEACHER);
        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("newPass1")).thenReturn("hashed-new");
        when(userRepository.save(existing)).thenReturn(existing);

        UserResponse result = userService.updateUser(1L,
                new UserRequest("new@example.com", "newPass1", Set.of(Role.ADMIN)));

        assertThat(result).isNotNull();
        assertThat(existing.getEmail()).isEqualTo("new@example.com");
        assertThat(existing.getPassword()).isEqualTo("hashed-new");
        assertThat(existing.getRoles()).containsExactly(Role.ADMIN);
    }

    @Test
    void updateUser_emptyPassword_keepsOldPassword() {
        User existing = user(1, "t@example.com", Role.TEACHER);
        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        userService.updateUser(1L, new UserRequest("t@example.com", "", Set.of(Role.TEACHER)));

        assertThat(existing.getPassword()).isEqualTo("hashed-old");
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void updateUser_emailTakenByAnotherUser_throws() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1, "me@example.com", Role.TEACHER)));
        when(userRepository.existsByEmail("admin@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.updateUser(1L,
                new UserRequest("admin@example.com", null, Set.of(Role.TEACHER))))
                .isInstanceOf(EmailAlreadyExistsException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUser_missingUser_throwsNotFound() {
        when(userRepository.findById(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUser(42L,
                new UserRequest("x@example.com", null, Set.of(Role.ADMIN))))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void deleteById_callsRepository() {
        userService.deleteById(4L);

        verify(userRepository).deleteById(4L);
    }
}

