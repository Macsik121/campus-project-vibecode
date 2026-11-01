package ru.campus.app.ui.auth;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.common.Validators;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.RegisterRequest;
import ru.campus.app.data.model.RegisterResponse;

/**
 * Форма регистрации (ТЗ):
 * поля Имя/Email/Пароль; проверки — не пусто, regex почты, пароль ≥6 + ≥1 спецсимвол.
 * Успех → создана заявка вожатого; вход возможен после одобрения директором.
 */
public class RegisterActivity extends AppCompatActivity {

    private EditText etName, etEmail, etPassword;
    private FreezeHelper freeze;
    private ApiClient client;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);
        client = ApiClient.get(this);

        etName = findViewById(R.id.etName);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        Button btnRegister = findViewById(R.id.btnRegister);
        TextView tvGoLogin = findViewById(R.id.tvGoLogin);
        ProgressBar progress = findViewById(R.id.progress);
        freeze = new FreezeHelper(findViewById(R.id.registerRoot), progress);

        btnRegister.setOnClickListener(v -> tryRegister());
        tvGoLogin.setOnClickListener(v -> finish());
    }

    private void tryRegister() {
        String name = etName.getText().toString().trim();
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString();

        if (Validators.isEmpty(name)) { etName.setError(getString(R.string.error_name_empty)); return; }
        if (Validators.isEmpty(email)) { etEmail.setError(getString(R.string.error_email_empty)); return; }
        if (!Validators.isEmail(email)) { etEmail.setError(getString(R.string.error_email_invalid)); return; }
        if (Validators.isEmpty(password)) { etPassword.setError(getString(R.string.error_password_empty)); return; }
        if (!Validators.isPasswordValid(password)) { etPassword.setError(getString(R.string.error_password_weak)); return; }

        freeze.freeze();
        client.api().register(new RegisterRequest(name, email, password)).enqueue(new Callback<RegisterResponse>() {
            @Override
            public void onResponse(Call<RegisterResponse> call, Response<RegisterResponse> response) {
                freeze.unfreeze();
                if (response.isSuccessful()) {
                    new AlertDialog.Builder(RegisterActivity.this)
                            .setTitle(R.string.register_title)
                            .setMessage(R.string.application_sent)
                            .setPositiveButton(android.R.string.ok, (d, w) -> finish())
                            .setCancelable(false)
                            .show();
                } else {
                    Ui.showError(RegisterActivity.this, response);
                }
            }

            @Override
            public void onFailure(Call<RegisterResponse> call, Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(RegisterActivity.this);
            }
        });
    }
}
