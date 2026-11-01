package ru.campus.app.ui.chat;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ProgressBar;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.ChatMessage;
import ru.campus.app.data.model.SendMessageRequest;
import ru.campus.app.data.socket.SocketManager;

/** Общий чат (MVP: одна комната для всех отрядов; realtime через socket.io chat:message) */
public class ChatFragment extends Fragment implements SocketManager.ChatListener {

    private ApiClient client;
    private FreezeHelper freeze;
    private ChatAdapter adapter;
    private RecyclerView rv;
    private EditText etMessage;
    private SocketManager socketManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_chat, container, false);
        client = ApiClient.get(requireContext());
        socketManager = SocketManager.get(requireContext());

        rv = view.findViewById(R.id.rvChat);
        LinearLayoutManager lm = new LinearLayoutManager(requireContext());
        lm.setStackFromEnd(true);
        rv.setLayoutManager(lm);
        adapter = new ChatAdapter(client.session().getUserId());
        rv.setAdapter(adapter);

        etMessage = view.findViewById(R.id.etMessage);
        MaterialButton btnSend = view.findViewById(R.id.btnSend);
        ProgressBar progress = view.findViewById(R.id.progress);
        freeze = new FreezeHelper(view.findViewById(R.id.chatRoot), progress);

        btnSend.setOnClickListener(v -> send());
        return view;
    }

    @Override
    public void onResume() {
        super.onResume();
        load();
        socketManager.addChatListener(this);
    }

    @Override
    public void onPause() {
        super.onPause();
        socketManager.removeChatListener(this);
    }

    private void load() {
        client.api().chatHistory(50).enqueue(new Callback<List<ChatMessage>>() {
            @Override
            public void onResponse(@NonNull Call<List<ChatMessage>> call,
                                   @NonNull Response<List<ChatMessage>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setMessages(response.body());
                    scrollToBottom();
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<ChatMessage>> call, @NonNull Throwable t) {
                Ui.showNetworkError(requireContext());
            }
        });
    }

    private void send() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;
        etMessage.setEnabled(false);
        client.api().sendMessage(new SendMessageRequest(text)).enqueue(new Callback<ChatMessage>() {
            @Override
            public void onResponse(@NonNull Call<ChatMessage> call,
                                   @NonNull Response<ChatMessage> response) {
                etMessage.setEnabled(true);
                if (response.isSuccessful() && response.body() != null) {
                    etMessage.setText("");
                    adapter.append(response.body());
                    scrollToBottom();
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<ChatMessage> call, @NonNull Throwable t) {
                etMessage.setEnabled(true);
                Ui.showNetworkError(requireContext());
            }
        });
    }

    @Override
    public void onMessage(ChatMessage message) {
        if (!isAdded()) return;
        // Не дублируем собственные сообщения (они добавлены по ответу REST)
        if (message.senderId != null && message.senderId.equals(client.session().getUserId())
                && adapter.contains(message.id)) return;
        adapter.append(message);
        scrollToBottom();
    }

    private void scrollToBottom() {
        if (adapter.getItemCount() > 0) rv.smoothScrollToPosition(adapter.getItemCount() - 1);
    }
}
