package ru.campus.app.data.model;

public class Profile {
    public String id;
    public String fullName;
    public String email;
    public String role;
    public String roleTitle;
    public String avatar;
    public String phoneNumber;
    public SquadInfo squad;

    public static class SquadInfo {
        public String id;
        public String title;
    }
}
