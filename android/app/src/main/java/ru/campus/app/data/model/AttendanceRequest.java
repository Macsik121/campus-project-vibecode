package ru.campus.app.data.model;

public class AttendanceRequest {
    public final String childId;
    public final boolean present;

    public AttendanceRequest(String childId, boolean present) {
        this.childId = childId;
        this.present = present;
    }
}
