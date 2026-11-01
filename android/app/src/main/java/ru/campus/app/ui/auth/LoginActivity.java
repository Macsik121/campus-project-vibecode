package ru.campus.app.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.common.Validators;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.AuthResponse;
import ru.campus.app.data.model.LoginRequest;
import ru.campus.app.data.model.Profile;
import ru.campus.app.data.prefs.SessionManager;
import ru.campus.app.ui.MainActivity;

/**
 * Форма авторизации (ТЗ):
 * поля Email/Пароль; проверки — почта не пуста, пароль не пуст, regex почты.
 * Успешный ответ → токен в SharedPreferences → MainActivity (раздел «Отряд»).
 */
public class LoginActivity extends AppCompatActivity {

    private EditText etEmail, etPassword;
    private FreezeHelper freeze;
    private ApiClient client;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        client = ApiClient.get(this);

        // Автовход при сохранённом токене
        if (client.session().hasToken()) {
            goMain();
            return;
        }

        setContentView(R.layout.activity_login);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        Button btnLogin = findViewById(R.id.btnLogin);
        TextView tvGoRegister = findViewById(R.id.tvGoRegister);
        ProgressBar progress = findViewById(R.id.progress);
        freeze = new FreezeHelper(findViewById(R.id.loginRoot), progress);

        btnLogin.setOnClickListener(v -> tryLogin());
        tvGoRegister.setOnClickListener(v ->
                startActivity(new Intent(this, RegisterActivity.class)));
    }

    private void tryLogin() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString();

        if (Validators.isEmpty(email)) { etEmail.setError(getString(R.string.error_email_empty)); return; }
        if (!Validators.isEmail(email)) { etEmail.setError(getString(R.string.error_email_invalid)); return; }
        if (Validators.isEmpty(password)) { etPassword.setError(getString(R.string.error_password_empty)); return; }

        freeze.freeze();
        client.api().login(new LoginRequest(email, password)).enqueue(new Callback<AuthResponse>() {
            @Override
            public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    client.session().saveToken(response.body().token);
                    loadProfileAndGo();
                } else {
                    freeze.unfreeze();
                    Ui.showError(LoginActivity.this, response);
                }
            }

            @Override
            public void onFailure(Call<AuthResponse> call, Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(LoginActivity.this);
            }
        });
    }

    /** Подгружаем профиль, чтобы сохранить роль (от неё зависит навигация) */
    private void loadProfileAndGo() {
        client.api().profile().enqueue(new Callback<Profile>() {
            @Override
            public void onResponse(Call<Profile> call, Response<Profile> response) {
                if (response.isSuccessful() && response.body() != null) {
                    SessionManager session = client.session();
                    session.saveRole(response.body().role);
                    session.saveUserId(response.body().id);
                    if (response.body().squad != null) {
                        session.saveSquad(response.body().squad.id, response.body().squad.title);
                    }
                }
                goMain();
            }

            @Override
            public void onFailure(Call<Profile> call, Throwable t) {
                goMain(); // токен валиден, профиль подтянется позже
            }
        });
    }

    private void goMain() {
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }
}
