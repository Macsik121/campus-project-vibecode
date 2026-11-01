package ru.campus.app.ui.admin;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;

import java.util.ArrayList;
import java.util.List;

import ru.campus.app.R;
import ru.campus.app.common.TimeAgo;
import ru.campus.app.data.model.Application;

public class ApplicationsAdapter extends RecyclerView.Adapter<ApplicationsAdapter.VH> {

    public interface ActionsListener {
        void onApprove(Application app);
        void onReject(Application app);
    }

    private final List<Application> items = new ArrayList<>();
    private final ActionsListener listener;

    public ApplicationsAdapter(ActionsListener listener) {
        this.listener = listener;
    }

    public void setItems(List<Application> newItems) {
        items.clear();
        if (newItems != null) items.addAll(newItems);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_application, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Application app = items.get(position);
        if (app.user != null) {
            h.name.setText(app.user.fullName);
            h.email.setText(app.user.email);
        }
        String statusText;
        switch (app.status != null ? app.status : "") {
            case "approved": statusText = "Одобрена"; break;
            case "rejected": statusText = "Отклонена" + (app.rejectReason != null ? ": " + app.rejectReason : ""); break;
            default: statusText = "На рассмотрении";
        }
        h.status.setText(statusText + " · " + TimeAgo.formatDateTime(app.createdAt));

        boolean pending = "pending".equals(app.status);
        h.actionsRow.setVisibility(pending ? View.VISIBLE : View.GONE);
        h.btnApprove.setOnClickListener(v -> listener.onApprove(app));
        h.btnReject.setOnClickListener(v -> listener.onReject(app));
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        final TextView name, email, status;
        final View actionsRow;
        final MaterialButton btnApprove, btnReject;

        VH(@NonNull View itemView) {
            super(itemView);
            name = itemView.findViewById(R.id.tvAppName);
            email = itemView.findViewById(R.id.tvAppEmail);
            status = itemView.findViewById(R.id.tvAppStatus);
            actionsRow = itemView.findViewById(R.id.actionsRow);
            btnApprove = itemView.findViewById(R.id.btnApprove);
            btnReject = itemView.findViewById(R.id.btnReject);
        }
    }
}
