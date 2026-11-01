package ru.campus.app.data.model;

import java.util.List;

public class ShiftStats {
    public Shift shift;
    public List<TypeCount> eventsByType;
    public Attendance attendance;
    public List<TypeCount> logsByMethod;
    public List<Warning> warnings;

    public static class Shift {
        public String id;
        public int shiftNo;
        public String start;
        public String end;
    }
    public static class TypeCount {
        public String event_type;
        public String method;
        public int count;
    }
    public static class Attendance {
        public int present;
        public int total;
    }
    public static class Warning {
        public String event;
        public String path;
        public String caused_by_name;
        public String created_at;
    }
}
