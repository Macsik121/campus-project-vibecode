package ru.campus.app.ui.profile;

import android.app.Dialog;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.google.android.material.button.MaterialButton;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.common.Validators;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.ChangePasswordRequest;
import ru.campus.app.data.model.MessageResponse;
import ru.campus.app.data.model.Profile;
import ru.campus.app.data.model.UpdateProfileRequest;
import ru.campus.app.ui.MainActivity;

/**
 * Раздел «Профиль» (ТЗ):
 * круглая картинка, имя, должность, отряд; изменяемые поля (имя, email, телефон);
 * «Сохранить изменения» — активна только после изменений (DataEditWaitButton);
 * «Сменить пароль», «Выйти из приложения», подпись версии.
 */
public class ProfileFragment extends Fragment {

    private ApiClient client;
    private FreezeHelper freeze;
    private TextView tvFullName, tvRole, tvSquad;
    private EditText etFullName, etEmail, etPhone;
    private MaterialButton btnSave;
    private Profile original;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_profile, container, false);
        client = ApiClient.get(requireContext());

        tvFullName = view.findViewById(R.id.tvFullName);
        tvRole = view.findViewById(R.id.tvRole);
        tvSquad = view.findViewById(R.id.tvSquad);
        etFullName = view.findViewById(R.id.etFullName);
        etEmail = view.findViewById(R.id.etEmail);
        etPhone = view.findViewById(R.id.etPhone);
        btnSave = view.findViewById(R.id.btnSaveChanges);
        ProgressBar progress = view.findViewById(R.id.progress);
        freeze = new FreezeHelper(view.findViewById(R.id.profileRoot), progress);

        btnSave.setOnClickListener(v -> save());
        view.findViewById(R.id.btnChangePassword).setOnClickListener(v -> showPasswordDialog());
        view.findViewById(R.id.btnLogout).setOnClickListener(v ->
                ((MainActivity) requireActivity()).logout());

        TextWatcher watcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { updateSaveButton(); }
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) { }
        };
        etFullName.addTextChangedListener(watcher);
        etEmail.addTextChangedListener(watcher);
        etPhone.addTextChangedListener(watcher);

        load();
        return view;
    }

    private void load() {
        freeze.freeze();
        client.api().profile().enqueue(new Callback<Profile>() {
            @Override
            public void onResponse(@NonNull Call<Profile> call, @NonNull Response<Profile> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    original = response.body();
                    tvFullName.setText(original.fullName);
                    tvRole.setText(original.roleTitle != null ? original.roleTitle : original.role);
                    tvSquad.setText(original.squad != null ? original.squad.title
                            : getString(R.string.squad_not_assigned));
                    etFullName.setText(original.fullName);
                    etEmail.setText(original.email);
                    etPhone.setText(original.phoneNumber);
                    client.session().saveRole(original.role);
                    client.session().saveUserId(original.id);
                    btnSave.setEnabled(false);
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<Profile> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    private void updateSaveButton() {
        if (original == null) { btnSave.setEnabled(false); return; }
        boolean changed = !etFullName.getText().toString().equals(safe(original.fullName))
                || !etEmail.getText().toString().equals(safe(original.email))
                || !etPhone.getText().toString().equals(safe(original.phoneNumber));
        btnSave.setEnabled(changed);
    }

    private String safe(String s) { return s != null ? s : ""; }

    private void save() {
        String email = etEmail.getText().toString().trim();
        if (!Validators.isEmail(email)) {
            etEmail.setError(getString(R.string.error_email_invalid));
            return;
        }
        freeze.freeze();
        client.api().updateProfile(new UpdateProfileRequest(
                etFullName.getText().toString().trim(), email, etPhone.getText().toString().trim()))
                .enqueue(new Callback<Profile>() {
                    @Override
                    public void onResponse(@NonNull Call<Profile> call, @NonNull Response<Profile> response) {
                        freeze.unfreeze();
                        if (response.isSuccessful() && response.body() != null) {
                            original = response.body();
                            tvFullName.setText(original.fullName);
                            btnSave.setEnabled(false);
                            Ui.toast(requireContext(), "Сохранено");
                        } else {
                            Ui.showError(requireContext(), response);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<Profile> call, @NonNull Throwable t) {
                        freeze.unfreeze();
                        Ui.showNetworkError(requireContext());
                    }
                });
    }

    private void showPasswordDialog() {
        Dialog dialog = new Dialog(requireContext());
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_password);

        EditText etOld = dialog.findViewById(R.id.etOldPassword);
        EditText etNew = dialog.findViewById(R.id.etNewPassword);
        MaterialButton btnSubmit = dialog.findViewById(R.id.btnSubmitPassword);

        btnSubmit.setOnClickListener(v -> {
            String oldPass = etOld.getText().toString();
            String newPass = etNew.getText().toString();
            if (!Validators.isPasswordValid(newPass)) {
                etNew.setError(getString(R.string.error_password_weak));
                return;
            }
            btnSubmit.setEnabled(false);
            client.api().changePassword(new ChangePasswordRequest(oldPass, newPass))
                    .enqueue(new Callback<MessageResponse>() {
                        @Override
                        public void onResponse(@NonNull Call<MessageResponse> call,
                                               @NonNull Response<MessageResponse> response) {
                            btnSubmit.setEnabled(true);
                            if (response.isSuccessful()) {
                                Ui.toast(requireContext(), getString(R.string.password_changed));
                                dialog.dismiss();
                            } else {
                                Ui.showError(requireContext(), response);
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<MessageResponse> call, @NonNull Throwable t) {
                            btnSubmit.setEnabled(true);
                            Ui.showNetworkError(requireContext());
                        }
                    });
        });

        dialog.show();
    }
}
