package ru.campus.app.data.prefs;

import android.content.Context;
import android.content.SharedPreferences;

/** Токен и данные сессии в SharedPreferences (по ТЗ) */
public class SessionManager {
    private static final String PREFS = "campus_session";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_ROLE = "role";
    private static final String KEY_SQUAD_ID = "squadId";
    private static final String KEY_SQUAD_TITLE = "squadTitle";
    private static final String KEY_USER_ID = "userId";

    private final SharedPreferences prefs;

    public SessionManager(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public void saveToken(String token) { prefs.edit().putString(KEY_TOKEN, token).apply(); }
    public String getToken() { return prefs.getString(KEY_TOKEN, null); }
    public boolean hasToken() { return getToken() != null; }

    public void saveRole(String role) { prefs.edit().putString(KEY_ROLE, role).apply(); }
    public String getRole() { return prefs.getString(KEY_ROLE, "counselour"); }
    public boolean isSeniorOrUp() {
        String r = getRole();
        return "senior_counselour".equals(r) || "director".equals(r);
    }
    public boolean isDirector() { return "director".equals(getRole()); }

    public void saveSquad(String squadId, String squadTitle) {
        prefs.edit().putString(KEY_SQUAD_ID, squadId).putString(KEY_SQUAD_TITLE, squadTitle).apply();
    }
    public String getSquadId() { return prefs.getString(KEY_SQUAD_ID, null); }
    public String getSquadTitle() { return prefs.getString(KEY_SQUAD_TITLE, null); }

    public void saveUserId(String userId) { prefs.edit().putString(KEY_USER_ID, userId).apply(); }
    public String getUserId() { return prefs.getString(KEY_USER_ID, null); }

    /** Выход из аккаунта: полная очистка SharedPreferences (ТЗ) */
    public void clear() { prefs.edit().clear().apply(); }
}
