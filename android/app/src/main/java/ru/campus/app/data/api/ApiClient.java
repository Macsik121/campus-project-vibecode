package ru.campus.app.data.api;

import android.content.Context;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import ru.campus.app.BuildConfig;
import ru.campus.app.data.model.ErrorResponse;
import ru.campus.app.data.prefs.SessionManager;

/** Retrofit singleton. AuthInterceptor прикрепляет Authorization: Bearer <token> (ТЗ). */
public class ApiClient {
    private static ApiClient instance;
    private final CampusApi api;
    private final SessionManager session;
    private final Gson gson = new GsonBuilder().create();

    private ApiClient(Context context) {
        session = new SessionManager(context);

        Interceptor authInterceptor = chain -> {
            Request original = chain.request();
            String token = session.getToken();
            if (token == null) return chain.proceed(original);
            Request withAuth = original.newBuilder()
                    .header("Authorization", "Bearer " + token)
                    .build();
            return chain.proceed(withAuth);
        };

        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(HttpLoggingInterceptor.Level.BASIC);

        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .addInterceptor(logging)
                .build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();

        api = retrofit.create(CampusApi.class);
    }

    public static synchronized ApiClient get(Context context) {
        if (instance == null) instance = new ApiClient(context.getApplicationContext());
        return instance;
    }

    public CampusApi api() { return api; }
    public SessionManager session() { return session; }

    /** Разбор тела ошибки {error:{code,message}} */
    public String errorMessage(retrofit2.Response<?> response, String fallback) {
        try {
            if (response.errorBody() == null) return fallback;
            ErrorResponse err = gson.fromJson(response.errorBody().charStream(), ErrorResponse.class);
            return err != null ? err.messageOr(fallback) : fallback;
        } catch (Exception e) {
            return fallback;
        }
    }
}
