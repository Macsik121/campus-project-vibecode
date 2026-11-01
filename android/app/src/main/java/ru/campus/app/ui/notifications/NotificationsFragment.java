package ru.campus.app.ui.notifications;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.MessageResponse;
import ru.campus.app.data.model.Notification;
import ru.campus.app.data.model.NotificationsResponse;
import ru.campus.app.data.socket.SocketManager;

/**
 * Раздел «Уведомления» (ТЗ):
 * количество непрочитанных; «Прочитать все» (скрывается при 0);
 * непрочитанные — синий фон + жирная полоса слева; realtime через socket.io.
 */
public class NotificationsFragment extends Fragment
        implements SocketManager.NotificationListener, NotificationsAdapter.OnReadListener {

    private ApiClient client;
    private FreezeHelper freeze;
    private TextView tvUnreadCount;
    private MaterialButton btnReadAll;
    private NotificationsAdapter adapter;
    private SocketManager socketManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_notifications, container, false);
        client = ApiClient.get(requireContext());
        socketManager = SocketManager.get(requireContext());

        tvUnreadCount = view.findViewById(R.id.tvUnreadCount);
        btnReadAll = view.findViewById(R.id.btnReadAll);
        ProgressBar progress = view.findViewById(R.id.progress);
        freeze = new FreezeHelper(view.findViewById(R.id.notifRoot), progress);

        RecyclerView rv = view.findViewById(R.id.rvNotifications);
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new NotificationsAdapter(this);
        rv.setAdapter(adapter);

        btnReadAll.setOnClickListener(v -> readAll());
        return view;
    }

    @Override
    public void onResume() {
        super.onResume();
        load();
        socketManager.addNotificationListener(this);
    }

    @Override
    public void onPause() {
        super.onPause();
        socketManager.removeNotificationListener(this);
    }

    private void load() {
        freeze.freeze();
        client.api().notifications(20).enqueue(new Callback<NotificationsResponse>() {
            @Override
            public void onResponse(@NonNull Call<NotificationsResponse> call,
                                   @NonNull Response<NotificationsResponse> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setItems(response.body().items);
                    updateUnread(response.body().unreadCount);
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<NotificationsResponse> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    private void updateUnread(int count) {
        if (!isAdded()) return;
        tvUnreadCount.setText(getString(R.string.notif_unread_count, count));
        btnReadAll.setVisibility(count > 0 ? View.VISIBLE : View.GONE);
    }

    /** Кнопка «Прочитано» в карточке: заморозка → обновление карточки и счётчика (ТЗ) */
    @Override
    public void onRead(Notification notification) {
        client.api().readNotification(new ru.campus.app.data.model.ReadNotificationRequest(notification.id))
                .enqueue(new Callback<Void>() {
                    @Override
                    public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                        if (response.isSuccessful()) {
                            adapter.markRead(notification.id);
                            updateUnread(adapter.getUnreadCount());
                        } else {
                            Ui.showError(requireContext(), response);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                        Ui.showNetworkError(requireContext());
                    }
                });
    }

    private void readAll() {
        freeze.freeze(); // заморозка после нажатия «Прочитать всё» (ТЗ)
        client.api().readAllNotifications().enqueue(new Callback<MessageResponse>() {
            @Override
            public void onResponse(@NonNull Call<MessageResponse> call,
                                   @NonNull Response<MessageResponse> response) {
                freeze.unfreeze();
                if (response.isSuccessful()) {
                    adapter.markAllRead();
                    updateUnread(0);
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<MessageResponse> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    /** Realtime: новое уведомление по socket.io */
    @Override
    public void onNew(Notification notification) {
        if (!isAdded()) return;
        adapter.prepend(notification);
        updateUnread(adapter.getUnreadCount());
    }
}
