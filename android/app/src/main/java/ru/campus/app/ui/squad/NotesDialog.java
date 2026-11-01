package ru.campus.app.ui.squad;

import android.app.Dialog;
import android.content.Context;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Window;
import android.widget.EditText;
import android.widget.TextView;

import com.google.android.material.button.MaterialButton;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.Child;
import ru.campus.app.data.model.UpdateChildRequest;

/**
 * Диалог редактирования заметок (ТЗ):
 * возраст, родитель (ФИО), телефон родителя, изменяемое поле «Заметки»,
 * кнопка «Сохранить заметки» (активна после изменений), красный крестик для закрытия.
 */
public class NotesDialog {

    public interface OnSavedListener { void onSaved(); }

    public static void show(Context context, ApiClient client, Child child, OnSavedListener onSaved) {
        Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_notes);

        TextView tvTitle = dialog.findViewById(R.id.tvDialogTitle);
        TextView tvAge = dialog.findViewById(R.id.tvAge);
        TextView tvParent = dialog.findViewById(R.id.tvParent);
        TextView tvParentPhone = dialog.findViewById(R.id.tvParentPhone);
        EditText etNotes = dialog.findViewById(R.id.etNotes);
        MaterialButton btnSave = dialog.findViewById(R.id.btnSaveNotes);
        TextView btnClose = dialog.findViewById(R.id.btnClose);

        tvTitle.setText(child.fullName);
        tvAge.setText(context.getString(R.string.child_age, child.age));
        tvParent.setText(context.getString(R.string.child_parent, child.parentFullName));
        tvParentPhone.setText(context.getString(R.string.child_parent_phone, child.parentPhone));
        etNotes.setText(child.notes);
        btnSave.setEnabled(false);

        etNotes.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { }
            @Override
            public void onTextChanged(CharSequence s, int a, int b, int c) {
                btnSave.setEnabled(!s.toString().equals(child.notes != null ? child.notes : ""));
            }
        });

        btnClose.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            btnSave.setEnabled(false);
            String newNotes = etNotes.getText().toString();
            client.api().updateChild(new UpdateChildRequest(child.id, newNotes))
                    .enqueue(new Callback<Child>() {
                        @Override
                        public void onResponse(Call<Child> call, Response<Child> response) {
                            if (response.isSuccessful() && response.body() != null) {
                                child.notes = response.body().notes;
                                Ui.toast(context, "Сохранено");
                                dialog.dismiss();
                                onSaved.onSaved();
                            } else {
                                btnSave.setEnabled(true);
                                Ui.showError(context, response);
                            }
                        }

                        @Override
                        public void onFailure(Call<Child> call, Throwable t) {
                            btnSave.setEnabled(true);
                            Ui.showNetworkError(context);
                        }
                    });
        });

        dialog.show();
    }
}
