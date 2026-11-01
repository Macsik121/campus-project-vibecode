package ru.campus.app.ui.squad;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
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

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.Child;
import ru.campus.app.data.model.SquadChildrenResponse;
import ru.campus.app.data.model.UserSquad;

/**
 * Раздел «Отряд» (ТЗ):
 * проверка принадлежности вожатого отряду (GET users/squad);
 * 404 → текст «не привязан»; иначе GET squads/{id}/children.
 * Количество детей = длина массива с сервера. Поиск — локальный фильтр.
 */
public class SquadFragment extends Fragment {

    private ApiClient client;
    private FreezeHelper freeze;
    private TextView tvSquadTitle, tvChildrenCount, tvNotAssigned;
    private ChildrenAdapter adapter;
    private final List<Child> allChildren = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_squad, container, false);
        client = ApiClient.get(requireContext());

        tvSquadTitle = view.findViewById(R.id.tvSquadTitle);
        tvChildrenCount = view.findViewById(R.id.tvChildrenCount);
        tvNotAssigned = view.findViewById(R.id.tvNotAssigned);
        ProgressBar progress = view.findViewById(R.id.progress);
        freeze = new FreezeHelper(view.findViewById(R.id.squadRoot), progress);

        RecyclerView rvChildren = view.findViewById(R.id.rvChildren);
        rvChildren.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new ChildrenAdapter(child -> NotesDialog.show(requireContext(), client, child,
                () -> adapter.notifyDataSetChanged()));
        rvChildren.setAdapter(adapter);

        TextView etSearch = view.findViewById(R.id.etSearch);
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { }
            @Override
            public void onTextChanged(CharSequence s, int a, int b, int c) {
                adapter.filter(allChildren, s.toString());
            }
        });

        loadSquad();
        return view;
    }

    private void loadSquad() {
        freeze.freeze();
        client.api().mySquad().enqueue(new Callback<UserSquad>() {
            @Override
            public void onResponse(@NonNull Call<UserSquad> call, @NonNull Response<UserSquad> response) {
                if (response.isSuccessful() && response.body() != null) {
                    loadChildren(response.body().squadId);
                } else if (response.code() == 404) {
                    freeze.unfreeze();
                    showNotAssigned();
                } else {
                    freeze.unfreeze();
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<UserSquad> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    private void showNotAssigned() {
        tvSquadTitle.setText(R.string.squad_title);
        tvChildrenCount.setText("");
        tvNotAssigned.setVisibility(View.VISIBLE);
    }

    private void loadChildren(String squadId) {
        client.api().children(squadId).enqueue(new Callback<SquadChildrenResponse>() {
            @Override
            public void onResponse(@NonNull Call<SquadChildrenResponse> call,
                                   @NonNull Response<SquadChildrenResponse> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    SquadChildrenResponse data = response.body();
                    client.session().saveSquad(data.squadId, data.squadTitle);
                    tvSquadTitle.setText(data.squadTitle);
                    tvChildrenCount.setText(getString(R.string.squad_children_count,
                            data.children != null ? data.children.size() : 0));
                    allChildren.clear();
                    if (data.children != null) allChildren.addAll(data.children);
                    adapter.filter(allChildren, "");
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<SquadChildrenResponse> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }
}
