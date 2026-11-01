package ru.campus.app.ui.admin;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import ru.campus.app.R;
import ru.campus.app.common.TimeAgo;
import ru.campus.app.data.model.LogItem;

public class LogsAdapter extends RecyclerView.Adapter<LogsAdapter.VH> {

    private final List<LogItem> items = new ArrayList<>();

    public void setItems(List<LogItem> newItems) {
        items.clear();
        if (newItems != null) items.addAll(newItems);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_log, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        LogItem item = items.get(position);
        h.event.setText(item.event);
        String who = item.caused_by_name != null ? item.caused_by_name : "—";
        h.meta.setText(String.format("%s %s · %s · %s",
                item.method != null ? item.method : "",
                item.path != null ? item.path : "",
                who,
                TimeAgo.formatDateTime(item.created_at)));
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        final TextView event, meta;

        VH(@NonNull View itemView) {
            super(itemView);
            event = itemView.findViewById(R.id.tvLogEvent);
            meta = itemView.findViewById(R.id.tvLogMeta);
        }
    }
}
