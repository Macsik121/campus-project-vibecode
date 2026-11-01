package ru.campus.app.ui.squad;

import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.textfield.TextInputEditText;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.Child;
import ru.campus.app.data.model.ChildTag;
import ru.campus.app.data.model.UpdateChildRequest;

/** Карточка ребёнка: ФИО, возраст, родитель/телефон, теги, заметки + «Сохранить заметки» (DataEditWaitButton) */
public class ChildrenAdapter extends RecyclerView.Adapter<ChildrenAdapter.VH> {

    public interface OnChildClickListener { void onEditNotes(Child child); }

    private final List<Child> items = new ArrayList<>();
    private final OnChildClickListener listener;

    public ChildrenAdapter(OnChildClickListener listener) {
        this.listener = listener;
    }

    public void filter(List<Child> all, String query) {
        items.clear();
        String q = query == null ? "" : query.toLowerCase(Locale.getDefault());
        for (Child c : all) {
            if (q.isEmpty() || (c.fullName != null && c.fullName.toLowerCase(Locale.getDefault()).contains(q))) {
                items.add(c);
            }
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_child, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Child child = items.get(position);
        h.name.setText(child.fullName);
        h.age.setText(h.itemView.getContext().getString(R.string.child_age, child.age));
        h.parent.setText(h.itemView.getContext().getString(R.string.child_parent, child.parentFullName));
        h.phone.setText(h.itemView.getContext().getString(R.string.child_parent_phone, child.parentPhone));

        h.tags.removeAllViews();
        if (child.tags != null) {
            for (ChildTag tag : child.tags) {
                Chip chip = new Chip(h.itemView.getContext());
                chip.setText(tag.info);
                chip.setChipBackgroundColorResource(colorForTag(tag.type));
                chip.setTextColor(h.itemView.getContext().getColor(R.color.white));
                chip.setClickable(false);
                h.tags.addView(chip);
            }
        }

        h.notes.setText(child.notes);
        h.btnSave.setEnabled(false); // DataEditWaitButton: серая, пока нет изменений

        TextWatcher watcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { }
            @Override
            public void onTextChanged(CharSequence s, int a, int b, int c) {
                String current = s.toString();
                h.btnSave.setEnabled(!current.equals(child.notes != null ? child.notes : ""));
            }
        };
        h.notes.addTextChangedListener(watcher);

        h.btnSave.setOnClickListener(v -> saveNotes(h, child));
        h.itemView.setOnLongClickListener(v -> {
            listener.onEditNotes(child);
            return true;
        });
    }

    private void saveNotes(VH h, Child child) {
        h.btnSave.setEnabled(false);
        String newNotes = h.notes.getText() != null ? h.notes.getText().toString() : "";
        ApiClient.get(h.itemView.getContext()).api()
                .updateChild(new UpdateChildRequest(child.id, newNotes))
                .enqueue(new Callback<Child>() {
                    @Override
                    public void onResponse(@NonNull Call<Child> call, @NonNull Response<Child> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            child.notes = response.body().notes;
                            Ui.toast(h.itemView.getContext(), "Сохранено");
                        } else {
                            h.btnSave.setEnabled(true);
                            Ui.showError(h.itemView.getContext(), response);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<Child> call, @NonNull Throwable t) {
                        h.btnSave.setEnabled(true);
                        Ui.showNetworkError(h.itemView.getContext());
                    }
                });
    }

    private int colorForTag(String type) {
        if (type == null) return R.color.gray;
        switch (type) {
            case "warning": return R.color.tag_warning;
            case "alert": return R.color.tag_alert;
            case "health": return R.color.tag_health;
            case "sports": return R.color.tag_sports;
            default: return R.color.gray;
        }
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        final TextView name, age, parent, phone;
        final ChipGroup tags;
        final TextInputEditText notes;
        final MaterialButton btnSave;

        VH(@NonNull View itemView) {
            super(itemView);
            name = itemView.findViewById(R.id.tvChildName);
            age = itemView.findViewById(R.id.tvChildAge);
            parent = itemView.findViewById(R.id.tvParent);
            phone = itemView.findViewById(R.id.tvParentPhone);
            tags = itemView.findViewById(R.id.chipGroupTags);
            notes = itemView.findViewById(R.id.etNotes);
            btnSave = itemView.findViewById(R.id.btnSaveNotes);
        }
    }
}
