# FunStudent

## Что нужно
- Java 21
- PostgreSQL (база `students_db`, логин/пароль из `application.yml`)
- Python 3

## Запуск
1. Запустить бэкенд: `StudentApplication` → ▶ в IntelliJ
   (или `./mvnw spring-boot:run`)
2. Запустить фронт в папке проекта:
   python server.py 3000 9090
   (9090 — порт бэкенда из `application.yml`)
3. Открыть http://localhost:3000

## Тестовые аккаунты
| Роль | Email | Пароль |
|---|---|---|
| Суперадмин | superadmin@example.com | superAdmin |
| Админ | admin@example.com | admin |
| Преподаватель | teacher@example.com | teacher |
