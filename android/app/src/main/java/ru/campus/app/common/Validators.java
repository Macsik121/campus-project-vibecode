package ru.campus.app.common;

import java.util.regex.Pattern;

/** Валидация форм по ТЗ: email regex; пароль ≥6 символов + ≥1 спецсимвол */
public class Validators {
    private static final Pattern EMAIL_RE = Pattern.compile("^[\\w.+-]+@[\\w-]+\\.[\\w.]+$");
    private static final Pattern PASSWORD_RE = Pattern.compile("^(?=.*[^A-Za-z0-9]).{6,}$");

    public static boolean isEmail(String s) {
        return s != null && EMAIL_RE.matcher(s).matches();
    }

    public static boolean isPasswordValid(String s) {
        return s != null && PASSWORD_RE.matcher(s).matches();
    }

    public static boolean isEmpty(String s) {
        return s == null || s.trim().isEmpty();
    }
}
