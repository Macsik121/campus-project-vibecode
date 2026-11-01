package ru.campus.app.data.model;

public class UpdateProfileRequest {
    public final String fullName;
    public final String email;
    public final String phoneNumber;

    public UpdateProfileRequest(String fullName, String email, String phoneNumber) {
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
    }
}
