package ru.campus.app.common;

import android.content.Context;
import android.widget.Toast;

import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.data.api.ApiClient;

public class Ui {

    public static void toast(Context ctx, String message) {
        Toast.makeText(ctx, message, Toast.LENGTH_LONG).show();
    }

    /** Показывает сообщение ошибки из {error:{code,message}} или сетевой fallback */
    public static void showError(Context ctx, Response<?> response) {
        String msg = ApiClient.get(ctx).errorMessage(response, ctx.getString(R.string.error_network));
        toast(ctx, msg);
    }

    public static void showNetworkError(Context ctx) {
        toast(ctx, ctx.getString(R.string.error_network));
    }
}
