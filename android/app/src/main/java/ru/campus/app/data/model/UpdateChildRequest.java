package ru.campus.app.data.model;

public class UpdateChildRequest {
    public final String id;
    public final String notes;

    public UpdateChildRequest(String id, String notes) {
        this.id = id;
        this.notes = notes;
    }
}
