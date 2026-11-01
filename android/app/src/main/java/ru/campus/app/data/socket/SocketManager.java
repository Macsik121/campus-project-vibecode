package ru.campus.app.data.socket;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.google.gson.Gson;

import org.json.JSONObject;

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

import io.socket.client.IO;
import io.socket.client.Socket;
import ru.campus.app.BuildConfig;
import ru.campus.app.data.model.ChatMessage;
import ru.campus.app.data.model.Notification;
import ru.campus.app.data.prefs.SessionManager;

/**
 * Socket.io-клиент: JWT на handshake (auth.token).
 * События MVP: notification:new, chat:message (ТЗ «Интеграция WebSocket»).
 */
public class SocketManager {
    public interface NotificationListener { void onNew(Notification notification); }
    public interface ChatListener { void onMessage(ChatMessage message); }

    private static SocketManager instance;
    private final SessionManager session;
    private final Gson gson = new Gson();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<NotificationListener> notificationListeners = new ArrayList<>();
    private final List<ChatListener> chatListeners = new ArrayList<>();
    private Socket socket;

    private SocketManager(Context context) {
        session = new SessionManager(context.getApplicationContext());
    }

    public static synchronized SocketManager get(Context context) {
        if (instance == null) instance = new SocketManager(context);
        return instance;
    }

    public synchronized void connect() {
        String token = session.getToken();
        if (token == null || (socket != null && socket.connected())) return;

        try {
            IO.Options options = new IO.Options();
            options.auth = java.util.Collections.singletonMap("token", token);
            options.reconnection = true;
            socket = IO.socket(BuildConfig.BASE_URL, options);

            socket.on("notification:new", args -> {
                if (args.length == 0) return;
                Notification n = gson.fromJson(((JSONObject) args[0]).toString(), Notification.class);
                mainHandler.post(() -> {
                    for (NotificationListener l : new ArrayList<>(notificationListeners)) l.onNew(n);
                });
            });

            socket.on("chat:message", args -> {
                if (args.length == 0) return;
                ChatMessage m = gson.fromJson(((JSONObject) args[0]).toString(), ChatMessage.class);
                mainHandler.post(() -> {
                    for (ChatListener l : new ArrayList<>(chatListeners)) l.onMessage(m);
                });
            });

            socket.connect();
        } catch (URISyntaxException ignored) { }
    }

    public synchronized void disconnect() {
        if (socket != null) {
            socket.disconnect();
            socket.off();
            socket = null;
        }
    }

    public void addNotificationListener(NotificationListener l) {
        if (!notificationListeners.contains(l)) notificationListeners.add(l);
    }
    public void removeNotificationListener(NotificationListener l) { notificationListeners.remove(l); }
    public void addChatListener(ChatListener l) {
        if (!chatListeners.contains(l)) chatListeners.add(l);
    }
    public void removeChatListener(ChatListener l) { chatListeners.remove(l); }
}
