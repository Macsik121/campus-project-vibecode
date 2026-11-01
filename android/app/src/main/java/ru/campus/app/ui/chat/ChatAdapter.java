package ru.campus.app.ui.chat;

import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import ru.campus.app.R;
import ru.campus.app.common.TimeAgo;
import ru.campus.app.data.model.ChatMessage;

/** Сообщения чата: свои — справа (зелёный фон), чужие — слева */
public class ChatAdapter extends RecyclerView.Adapter<ChatAdapter.VH> {

    private final List<ChatMessage> messages = new ArrayList<>();
    private final String myUserId;

    public ChatAdapter(String myUserId) {
        this.myUserId = myUserId;
    }

    public void setMessages(List<ChatMessage> newMessages) {
        messages.clear();
        if (newMessages != null) messages.addAll(newMessages);
        notifyDataSetChanged();
    }

    public void append(ChatMessage message) {
        messages.add(message);
        notifyItemInserted(messages.size() - 1);
    }

    public boolean contains(String id) {
        for (ChatMessage m : messages) if (m.id != null && m.id.equals(id)) return true;
        return false;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_chat_message, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        ChatMessage m = messages.get(position);
        h.sender.setText(m.senderName != null ? m.senderName : "");
        h.message.setText(m.message);
        h.time.setText(TimeAgo.formatDateTime(m.sentAt));

        boolean mine = myUserId != null && myUserId.equals(m.senderId);
        h.bubble.setBackgroundResource(mine ? R.drawable.bg_chat_mine : R.drawable.bg_chat_other);
        LinearLayout.LayoutParams params = (LinearLayout.LayoutParams) h.bubble.getLayoutParams();
        params.gravity = mine ? Gravity.END : Gravity.START;
        h.bubble.setLayoutParams(params);
        h.sender.setVisibility(mine ? View.GONE : View.VISIBLE);
    }

    @Override
    public int getItemCount() { return messages.size(); }

    static class VH extends RecyclerView.ViewHolder {
        final LinearLayout bubble;
        final TextView sender, message, time;

        VH(@NonNull View itemView) {
            super(itemView);
            bubble = itemView.findViewById(R.id.bubble);
            sender = itemView.findViewById(R.id.tvSender);
            message = itemView.findViewById(R.id.tvMessage);
            time = itemView.findViewById(R.id.tvTime);
        }
    }
}
