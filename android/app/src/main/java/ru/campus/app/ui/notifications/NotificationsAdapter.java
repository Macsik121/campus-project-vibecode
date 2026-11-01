package ru.campus.app.ui.notifications;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;

import java.util.ArrayList;
import java.util.List;

import ru.campus.app.R;
import ru.campus.app.common.TimeAgo;
import ru.campus.app.data.model.Notification;

/** Карточка уведомления: иконка по типу, unread — синий фон + полоса слева, относительное время */
public class NotificationsAdapter extends RecyclerView.Adapter<NotificationsAdapter.VH> {

    public interface OnReadListener { void onRead(Notification notification); }

    private final List<Notification> items = new ArrayList<>();
    private final OnReadListener listener;

    public NotificationsAdapter(OnReadListener listener) {
        this.listener = listener;
    }

    public void setItems(List<Notification> newItems) {
        items.clear();
        if (newItems != null) items.addAll(newItems);
        notifyDataSetChanged();
    }

    public void prepend(Notification notification) {
        items.add(0, notification);
        notifyItemInserted(0);
    }

    public void markRead(String id) {
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).id.equals(id) && !items.get(i).isRead) {
                items.get(i).isRead = true;
                notifyItemChanged(i);
                return;
            }
        }
    }

    public void markAllRead() {
        for (Notification n : items) n.isRead = true;
        notifyDataSetChanged();
    }

    public int getUnreadCount() {
        int count = 0;
        for (Notification n : items) if (!n.isRead) count++;
        return count;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_notification, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Notification n = items.get(position);
        h.title.setText(n.title);
        h.description.setText(n.description);
        h.time.setText(TimeAgo.format(h.itemView.getContext(), n.sentAt));
        h.icon.setImageResource(iconFor(n.kind));
        h.root.setBackgroundResource(
                n.isRead ? R.drawable.bg_notification_read : R.drawable.bg_notification_unread);
        h.btnRead.setVisibility(n.isRead ? View.GONE : View.VISIBLE);
        h.btnRead.setOnClickListener(v -> listener.onRead(n));
    }

    private int iconFor(String kind) {
        if ("important".equals(kind)) return R.drawable.ic_important;
        if ("map".equals(kind)) return R.drawable.ic_map;
        return R.drawable.ic_info;
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        final View root;
        final ImageView icon;
        final TextView title, description, time;
        final MaterialButton btnRead;

        VH(@NonNull View itemView) {
            super(itemView);
            root = itemView.findViewById(R.id.notifRoot);
            icon = itemView.findViewById(R.id.ivIcon);
            title = itemView.findViewById(R.id.tvTitle);
            description = itemView.findViewById(R.id.tvDescription);
            time = itemView.findViewById(R.id.tvTime);
            btnRead = itemView.findViewById(R.id.btnRead);
        }
    }
}
