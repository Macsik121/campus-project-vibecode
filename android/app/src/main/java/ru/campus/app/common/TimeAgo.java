package ru.campus.app.common;

import android.content.Context;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import ru.campus.app.R;

/**
 * Относительное время по ТЗ:
 * <1 мин — секунды; <1 ч — минуты; <1 дня — часы; <30 дней — дни; иначе дд.мм.гггг
 */
public class TimeAgo {

    public static String format(Context ctx, String isoDate) {
        Date date = parseIso(isoDate);
        if (date == null) return "";
        long diffMs = System.currentTimeMillis() - date.getTime();
        if (diffMs < 0) diffMs = 0;

        long seconds = diffMs / 1000;
        if (seconds < 60) return ctx.getString(R.string.notif_seconds, seconds);
        long minutes = seconds / 60;
        if (minutes < 60) return ctx.getString(R.string.notif_minutes, minutes);
        long hours = minutes / 60;
        if (hours < 24) return ctx.getString(R.string.notif_hours, hours);
        long days = hours / 24;
        if (days < 30) return ctx.getString(R.string.notif_days, days);

        return new SimpleDateFormat("dd.MM.yyyy", Locale.getDefault()).format(date);
    }

    public static Date parseIso(String iso) {
        if (iso == null) return null;
        String[] patterns = {
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                "yyyy-MM-dd'T'HH:mm:ssX"
        };
        for (String p : patterns) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(p, Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                return sdf.parse(iso);
            } catch (ParseException ignored) { }
        }
        return null;
    }

    public static String formatTime(String iso) {
        Date d = parseIso(iso);
        if (d == null) return "";
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(d);
    }

    public static String formatDateTime(String iso) {
        Date d = parseIso(iso);
        if (d == null) return "";
        return new SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault()).format(d);
    }
}
