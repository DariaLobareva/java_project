package com.example.student.mapper;

import com.example.student.dto.StudentRequest;
import com.example.student.dto.StudentResponseList;
import com.example.student.model.Student;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StudentMapperImplTest {

    private final StudentMapperImpl mapper = new StudentMapperImpl();

    @Test
    void requestToStudent_copiesAllFields() {
        Student s = mapper.requestToStudent(
                new StudentRequest("Ivan", "Ivanov", "+79001234567", "ivan@mail.ru"));

        assertThat(s.getName()).isEqualTo("Ivan");
        assertThat(s.getSurname()).isEqualTo("Ivanov");
        assertThat(s.getPhoneNumber()).isEqualTo("+79001234567");
        assertThat(s.getEmail()).isEqualTo("ivan@mail.ru");
    }

    @Test
    void listMapping_countsStudents() {
        Student a = new Student(); a.setId(1L); a.setName("A"); a.setSurname("AA");
        Student b = new Student(); b.setId(2L); b.setName("B"); b.setSurname("BB");

        StudentResponseList list = mapper.studentListToStudentResponseList(List.of(a, b));

        assertThat(list.getTotalCount()).isEqualTo(2);
        assertThat(list.getResponse()).hasSize(2);
    }

    @Test
    void emptyList_givesZero() {
        assertThat(mapper.studentListToStudentResponseList(List.of()).getTotalCount()).isZero();
    }
}

