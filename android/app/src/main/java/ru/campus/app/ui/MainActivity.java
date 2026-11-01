package ru.campus.app.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;

import ru.campus.app.R;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.prefs.SessionManager;
import ru.campus.app.data.socket.SocketManager;
import ru.campus.app.ui.admin.ApplicationsFragment;
import ru.campus.app.ui.admin.LogsFragment;
import ru.campus.app.ui.admin.StatsFragment;
import ru.campus.app.ui.auth.LoginActivity;
import ru.campus.app.ui.chat.ChatFragment;
import ru.campus.app.ui.journal.JournalFragment;
import ru.campus.app.ui.map.MapFragment;
import ru.campus.app.ui.notifications.NotificationsFragment;
import ru.campus.app.ui.profile.ProfileFragment;
import ru.campus.app.ui.squad.SquadFragment;

/**
 * Основная часть приложения (ТЗ «Введение»):
 * bottomNavigationView всегда прикреплена к низу; первый раздел после входа — «Отряд».
 * Видимость вкладок зависит от роли (JWT/профиль): senior+ — Логи, Заявки; director — Статистика.
 */
public class MainActivity extends AppCompatActivity {

    private BottomNavigationView bottomNav;
    private SessionManager session;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = ApiClient.get(this).session();
        if (!session.hasToken()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        setContentView(R.layout.activity_main);
        bottomNav = findViewById(R.id.bottomNav);
        configureMenuByRole();

        bottomNav.setOnItemSelectedListener(item -> {
            showFragment(fragmentFor(item.getItemId()));
            return true;
        });

        if (savedInstanceState == null) {
            bottomNav.setSelectedItemId(R.id.nav_squad); // первый раздел — «Отряд»
        }

        SocketManager.get(this).connect();
    }

    private void configureMenuByRole() {
        Menu menu = bottomNav.getMenu();
        boolean senior = session.isSeniorOrUp();
        if (senior) {
            menu.add(Menu.NONE, R.id.nav_logs, Menu.NONE, R.string.nav_logs)
                    .setIcon(R.drawable.ic_journal);
            menu.add(Menu.NONE, R.id.nav_applications, Menu.NONE, R.string.nav_applications)
                    .setIcon(R.drawable.ic_profile);
        }
        if (session.isDirector()) {
            menu.add(Menu.NONE, R.id.nav_stats, Menu.NONE, R.string.nav_stats)
                    .setIcon(R.drawable.ic_journal);
        }
    }

    private Fragment fragmentFor(int itemId) {
        if (itemId == R.id.nav_journal) return new JournalFragment();
        if (itemId == R.id.nav_notifications) return new NotificationsFragment();
        if (itemId == R.id.nav_map) return new MapFragment();
        if (itemId == R.id.nav_chat) return new ChatFragment();
        if (itemId == R.id.nav_profile) return new ProfileFragment();
        if (itemId == R.id.nav_logs) return new LogsFragment();
        if (itemId == R.id.nav_applications) return new ApplicationsFragment();
        if (itemId == R.id.nav_stats) return new StatsFragment();
        return new SquadFragment();
    }

    private void showFragment(Fragment fragment) {
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .commit();
    }

    /** Выход из аккаунта (вызывается из ProfileFragment) */
    public void logout() {
        new AlertDialog.Builder(this)
                .setMessage(R.string.btn_logout)
                .setPositiveButton(android.R.string.ok, (d, w) -> {
                    SocketManager.get(this).disconnect();
                    session.clear(); // очистка SharedPreferences (ТЗ)
                    Intent intent = new Intent(this, LoginActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    finish();
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (isFinishing()) SocketManager.get(this).disconnect();
    }
}
