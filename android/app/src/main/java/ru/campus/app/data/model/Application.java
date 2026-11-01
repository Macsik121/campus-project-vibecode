package ru.campus.app.data.model;

public class Application {
    public String id;
    public String status;
    public String rejectReason;
    public String createdAt;
    public User user;

    public static class User {
        public String id;
        public String fullName;
        public String email;
        public String role;
    }
}
