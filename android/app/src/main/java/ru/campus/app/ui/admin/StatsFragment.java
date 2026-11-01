package ru.campus.app.ui.admin;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.TimeAgo;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.ShiftStats;

/** Раздел «Статистика» (director): мероприятия по типам, посещаемость, предупреждения из логов */
public class StatsFragment extends Fragment {

    private FreezeHelper freeze;
    private TextView tvShift, tvAttendance;
    private LinearLayout eventsContainer, warningsContainer;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_stats, container, false);
        freeze = new FreezeHelper(view.findViewById(R.id.statsRoot),
                (ProgressBar) view.findViewById(R.id.progress));
        tvShift = view.findViewById(R.id.tvShift);
        tvAttendance = view.findViewById(R.id.tvAttendance);
        eventsContainer = view.findViewById(R.id.eventsByTypeContainer);
        warningsContainer = view.findViewById(R.id.warningsContainer);

        load();
        return view;
    }

    private void load() {
        freeze.freeze();
        ApiClient.get(requireContext()).api().shiftStats().enqueue(new Callback<ShiftStats>() {
            @Override
            public void onResponse(@NonNull Call<ShiftStats> call, @NonNull Response<ShiftStats> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    bind(response.body());
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<ShiftStats> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    private void bind(ShiftStats stats) {
        if (stats.shift != null) {
            tvShift.setText(String.format("Смена №%d: %s — %s", stats.shift.shiftNo,
                    TimeAgo.formatDateTime(stats.shift.start), TimeAgo.formatDateTime(stats.shift.end)));
        }

        eventsContainer.removeAllViews();
        if (stats.eventsByType != null) {
            for (ShiftStats.TypeCount tc : stats.eventsByType) {
                TextView row = new TextView(requireContext());
                row.setText(String.format("• %s: %d", tc.event_type, tc.count));
                row.setTextSize(15f);
                eventsContainer.addView(row);
            }
        }

        if (stats.attendance != null) {
            tvAttendance.setText(getString(R.string.stats_attendance,
                    stats.attendance.present, stats.attendance.total));
        }

        warningsContainer.removeAllViews();
        if (stats.warnings != null && !stats.warnings.isEmpty()) {
            for (ShiftStats.Warning w : stats.warnings) {
                TextView row = new TextView(requireContext());
                row.setText(String.format("⚠ %s (%s, %s)", w.event,
                        w.caused_by_name != null ? w.caused_by_name : "—",
                        TimeAgo.formatDateTime(w.created_at)));
                row.setTextSize(14f);
                warningsContainer.addView(row);
            }
        } else {
            TextView row = new TextView(requireContext());
            row.setText("Предупреждений нет");
            row.setTextSize(14f);
            warningsContainer.addView(row);
        }
    }
}
