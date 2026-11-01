package ru.campus.app.data.model;

public class ErrorResponse {
    public ErrorBody error;

    public static class ErrorBody {
        public String code;
        public String message;
    }

    public String messageOr(String fallback) {
        return error != null && error.message != null ? error.message : fallback;
    }
}
