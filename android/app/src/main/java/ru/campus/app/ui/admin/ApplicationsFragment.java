package ru.campus.app.ui.admin;

import android.app.AlertDialog;
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

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.Application;
import ru.campus.app.data.model.RejectRequest;

/**
 * Раздел «Заявки вожатых» (senior+):
 * просмотр, одобрение, отклонение с причиной, отклонение всех одной причиной (ТЗ).
 */
public class ApplicationsFragment extends Fragment implements ApplicationsAdapter.ActionsListener {

    private ApiClient client;
    private FreezeHelper freeze;
    private ApplicationsAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_applications, container, false);
        client = ApiClient.get(requireContext());
        freeze = new FreezeHelper(view.findViewById(R.id.appsRoot),
                (ProgressBar) view.findViewById(R.id.progress));

        RecyclerView rv = view.findViewById(R.id.rvApplications);
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new ApplicationsAdapter(this);
        rv.setAdapter(adapter);

        view.findViewById(R.id.btnRejectAll).setOnClickListener(v -> rejectAll());

        load();
        return view;
    }

    private void load() {
        freeze.freeze();
        client.api().applications(null).enqueue(new Callback<List<Application>>() {
            @Override
            public void onResponse(@NonNull Call<List<Application>> call,
                                   @NonNull Response<List<Application>> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setItems(response.body());
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Application>> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    @Override
    public void onApprove(Application app) {
        freeze.freeze();
        client.api().approveApplication(app.id).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                if (response.isSuccessful()) {
                    Ui.toast(requireContext(), "Одобрено");
                    load();
                } else {
                    freeze.unfreeze();
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    @Override
    public void onReject(Application app) {
        EditText input = new EditText(requireContext());
        input.setHint(R.string.reject_reason_hint);
        new AlertDialog.Builder(requireContext())
                .setTitle(R.string.btn_reject)
                .setView(input)
                .setPositiveButton(android.R.string.ok, (d, w) -> {
                    String reason = input.getText().toString().trim();
                    if (reason.isEmpty()) return;
                    freeze.freeze();
                    client.api().rejectApplication(app.id, new RejectRequest(reason))
                            .enqueue(simpleReloadCallback());
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    private void rejectAll() {
        String reason = getString(R.string.reject_all_reason);
        new AlertDialog.Builder(requireContext())
                .setTitle(R.string.btn_reject_all)
                .setMessage(reason)
                .setPositiveButton(android.R.string.ok, (d, w) -> {
                    freeze.freeze();
                    client.api().applications("pending").enqueue(new Callback<List<Application>>() {
                        @Override
                        public void onResponse(@NonNull Call<List<Application>> call,
                                               @NonNull Response<List<Application>> response) {
                            if (response.isSuccessful() && response.body() != null) {
                                rejectNext(response.body(), 0, reason);
                            } else {
                                freeze.unfreeze();
                                Ui.showError(requireContext(), response);
                            }
                        }

                        @Override
                        public void onFailure(@NonNull Call<List<Application>> call, @NonNull Throwable t) {
                            freeze.unfreeze();
                            Ui.showNetworkError(requireContext());
                        }
                    });
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    /** Последовательное отклонение всех pending-заявок одной причиной */
    private void rejectNext(List<Application> pending, int index, String reason) {
        if (index >= pending.size()) {
            Ui.toast(requireContext(), "Отклонено: " + pending.size());
            load();
            return;
        }
        client.api().rejectApplication(pending.get(index).id, new RejectRequest(reason))
                .enqueue(new Callback<Void>() {
                    @Override
                    public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                        rejectNext(pending, index + 1, reason);
                    }

                    @Override
                    public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                        rejectNext(pending, index + 1, reason);
                    }
                });
    }

    private Callback<Void> simpleReloadCallback() {
        return new Callback<Void>() {
            @Override
            public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                if (response.isSuccessful()) load();
                else { freeze.unfreeze(); Ui.showError(requireContext(), response); }
            }

            @Override
            public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        };
    }
}
