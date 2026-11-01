package ru.campus.app.ui.admin;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.LogItem;

/** Раздел «Логи действий» (senior+): каждое изменяющее обращение к API */
public class LogsFragment extends Fragment {

    private FreezeHelper freeze;
    private LogsAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_logs, container, false);
        freeze = new FreezeHelper(view.findViewById(R.id.logsRoot),
                (ProgressBar) view.findViewById(R.id.progress));

        RecyclerView rv = view.findViewById(R.id.rvLogs);
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new LogsAdapter();
        rv.setAdapter(adapter);

        load();
        return view;
    }

    private void load() {
        freeze.freeze();
        ApiClient.get(requireContext()).api().logs(50).enqueue(new Callback<List<LogItem>>() {
            @Override
            public void onResponse(@NonNull Call<List<LogItem>> call,
                                   @NonNull Response<List<LogItem>> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setItems(response.body());
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<LogItem>> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }
}
