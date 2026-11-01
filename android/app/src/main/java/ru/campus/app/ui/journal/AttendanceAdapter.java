package ru.campus.app.ui.journal;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import ru.campus.app.R;
import ru.campus.app.data.model.Child;

/** Список детей с «галочками» присутствия на выбранном мероприятии */
public class AttendanceAdapter extends RecyclerView.Adapter<AttendanceAdapter.VH> {

    public interface OnToggleListener { void onToggle(Child child, boolean present); }

    private final List<Child> children = new ArrayList<>();
    private final Set<String> presentIds = new HashSet<>();
    private final OnToggleListener listener;
    private boolean interactionsEnabled = false;

    public AttendanceAdapter(OnToggleListener listener) {
        this.listener = listener;
    }

    public void setData(List<Child> newChildren, Set<String> present, boolean eventSelected) {
        children.clear();
        if (newChildren != null) children.addAll(newChildren);
        presentIds.clear();
        if (present != null) presentIds.addAll(present);
        interactionsEnabled = eventSelected;
        notifyDataSetChanged();
    }

    public void setInteractionsEnabled(boolean enabled) {
        interactionsEnabled = enabled;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_attendance, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Child child = children.get(position);
        h.name.setText(child.fullName);
        h.checkBox.setOnCheckedChangeListener(null);
        h.checkBox.setChecked(presentIds.contains(child.id));
        h.checkBox.setEnabled(interactionsEnabled);
        h.checkBox.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (buttonView.isPressed()) listener.onToggle(child, isChecked);
        });
    }

    @Override
    public int getItemCount() { return children.size(); }

    static class VH extends RecyclerView.ViewHolder {
        final TextView name;
        final CheckBox checkBox;

        VH(@NonNull View itemView) {
            super(itemView);
            name = itemView.findViewById(R.id.tvChildName);
            checkBox = itemView.findViewById(R.id.cbPresent);
        }
    }
}
