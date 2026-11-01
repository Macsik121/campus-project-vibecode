package ru.campus.app.common;

import android.view.View;
import android.view.ViewGroup;

/**
 * Заморозка раздела на время запроса (ТЗ):
 * 1) после действия — нельзя нажать ни одну кнопку (блокировка + ProgressBar);
 * 2) после ответа — интерфейс обновляется и размораживается.
 */
public class FreezeHelper {
    private final ViewGroup root;
    private final View progress;

    public FreezeHelper(ViewGroup root, View progress) {
        this.root = root;
        this.progress = progress;
    }

    public void freeze() {
        setEnabledRecursive(root, false);
        if (progress != null) progress.setVisibility(View.VISIBLE);
    }

    public void unfreeze() {
        setEnabledRecursive(root, true);
        if (progress != null) progress.setVisibility(View.GONE);
    }

    private void setEnabledRecursive(View view, boolean enabled) {
        if (view == progress) return;
        view.setEnabled(enabled);
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                setEnabledRecursive(group.getChildAt(i), enabled);
            }
        }
    }
}
