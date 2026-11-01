package ru.campus.app.data.model;

public class RegisterRequest {
    public final String name;
    public final String email;
    public final String password;

    public RegisterRequest(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }
}
