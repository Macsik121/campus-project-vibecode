package ru.campus.app;

import android.app.Application;

import ru.campus.app.data.api.ApiClient;

public class CampusApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        ApiClient.get(this);
    }
}
