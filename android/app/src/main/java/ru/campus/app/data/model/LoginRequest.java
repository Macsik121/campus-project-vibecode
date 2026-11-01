package ru.campus.app.data.model;

public class LoginRequest {
    public final String email;
    public final String password;

    public LoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }
}
