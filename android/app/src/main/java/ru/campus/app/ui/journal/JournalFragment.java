package ru.campus.app.ui.journal;

import android.app.DatePickerDialog;
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

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import ru.campus.app.R;
import ru.campus.app.common.FreezeHelper;
import ru.campus.app.common.Ui;
import ru.campus.app.data.api.ApiClient;
import ru.campus.app.data.model.AttendanceResponse;
import ru.campus.app.data.model.Child;
import ru.campus.app.data.model.Event;
import ru.campus.app.data.model.SquadChildrenResponse;
import ru.campus.app.data.model.UserSquad;

/**
 * Раздел «Журнал» (ТЗ):
 * изначально — фильтр «все активности за текущий день», «Присутствует: не выбрана активность».
 * Выбор события → GET attendance → галочки; повторный тап снимает выбор.
 * Галочка → POST attendance; счётчик «Присутствует: n/N».
 */
public class JournalFragment extends Fragment implements EventsAdapter.OnEventClickListener,
        AttendanceAdapter.OnToggleListener {

    private ApiClient client;
    private FreezeHelper freeze;
    private TextView tvPresentCount;
    private EventsAdapter eventsAdapter;
    private AttendanceAdapter attendanceAdapter;
    private String squadId;
    private Event selectedEvent;
    private final List<Child> children = new ArrayList<>();
    private final Set<String> presentIds = new HashSet<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_journal, container, false);
        client = ApiClient.get(requireContext());

        tvPresentCount = view.findViewById(R.id.tvPresentCount);
        ProgressBar progress = view.findViewById(R.id.progress);
        freeze = new FreezeHelper(view.findViewById(R.id.journalRoot), progress);

        RecyclerView rvEvents = view.findViewById(R.id.rvEvents);
        rvEvents.setLayoutManager(new LinearLayoutManager(requireContext()));
        eventsAdapter = new EventsAdapter(this);
        rvEvents.setAdapter(eventsAdapter);

        RecyclerView rvAttendance = view.findViewById(R.id.rvAttendance);
        rvAttendance.setLayoutManager(new LinearLayoutManager(requireContext()));
        attendanceAdapter = new AttendanceAdapter(this);
        rvAttendance.setAdapter(attendanceAdapter);

        view.findViewById(R.id.btnPickDate).setOnClickListener(v -> pickDate());

        loadInitial();
        return view;
    }

    private void loadInitial() {
        freeze.freeze();
        String cachedSquadId = client.session().getSquadId();
        if (cachedSquadId != null) {
            squadId = cachedSquadId;
            loadChildrenAndEvents(null);
        } else {
            client.api().mySquad().enqueue(new Callback<UserSquad>() {
                @Override
                public void onResponse(@NonNull Call<UserSquad> call, @NonNull Response<UserSquad> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        squadId = response.body().squadId;
                        loadChildrenAndEvents(null);
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
    }

    private void loadChildrenAndEvents(@Nullable String date) {
        client.api().children(squadId).enqueue(new Callback<SquadChildrenResponse>() {
            @Override
            public void onResponse(@NonNull Call<SquadChildrenResponse> call,
                                   @NonNull Response<SquadChildrenResponse> response) {
                if (response.isSuccessful() && response.body() != null && response.body().children != null) {
                    children.clear();
                    children.addAll(response.body().children);
                    attendanceAdapter.setData(children, presentIds, selectedEvent != null);
                    updatePresentCount();
                }
                loadEvents(date);
            }

            @Override
            public void onFailure(@NonNull Call<SquadChildrenResponse> call, @NonNull Throwable t) {
                loadEvents(date);
            }
        });
    }

    private void loadEvents(@Nullable String date) {
        // Без date — последние 10 (фильтр по умолчанию из ТЗ: активности за текущий день
        // обеспечивает серверный интервал при передаче date = today)
        String effectiveDate = date != null ? date
                : new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().getTime());
        client.api().events(effectiveDate, 10).enqueue(new Callback<List<Event>>() {
            @Override
            public void onResponse(@NonNull Call<List<Event>> call, @NonNull Response<List<Event>> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    eventsAdapter.setEvents(response.body(), selectedEvent);
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Event>> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    private void pickDate() {
        Calendar cal = Calendar.getInstance();
        new DatePickerDialog(requireContext(), (view, year, month, day) -> {
            String date = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day);
            freeze.freeze();
            selectedEvent = null;
            presentIds.clear();
            attendanceAdapter.setData(children, presentIds, false);
            updatePresentCount();
            loadEvents(date);
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show();
    }

    /** Выбор/снятие выбора мероприятия (повторный тап отменяет выбор — ТЗ) */
    @Override
    public void onEventClick(Event event) {
        if (selectedEvent != null && selectedEvent.id.equals(event.id)) {
            selectedEvent = null;
            presentIds.clear();
            attendanceAdapter.setData(children, presentIds, false);
            eventsAdapter.setEvents(eventsAdapter.getEvents(), null);
            updatePresentCount();
            return;
        }
        selectedEvent = event;
        eventsAdapter.setEvents(eventsAdapter.getEvents(), event);
        freeze.freeze(); // заморозка после выбора мероприятия (ТЗ)
        client.api().attendance(event.id, squadId).enqueue(new Callback<AttendanceResponse>() {
            @Override
            public void onResponse(@NonNull Call<AttendanceResponse> call,
                                   @NonNull Response<AttendanceResponse> response) {
                freeze.unfreeze();
                if (response.isSuccessful() && response.body() != null) {
                    presentIds.clear();
                    if (response.body().childIds != null) presentIds.addAll(response.body().childIds);
                    attendanceAdapter.setData(children, presentIds, true);
                    updatePresentCount();
                } else {
                    Ui.showError(requireContext(), response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<AttendanceResponse> call, @NonNull Throwable t) {
                freeze.unfreeze();
                Ui.showNetworkError(requireContext());
            }
        });
    }

    /** Отметка ребёнка на выбранном мероприятии */
    @Override
    public void onToggle(Child child, boolean present) {
        if (selectedEvent == null) return;
        attendanceAdapter.setInteractionsEnabled(false);
        client.api().markAttendance(selectedEvent.id,
                        new ru.campus.app.data.model.AttendanceRequest(child.id, present))
                .enqueue(new Callback<ru.campus.app.data.model.MessageResponse>() {
                    @Override
                    public void onResponse(@NonNull Call<ru.campus.app.data.model.MessageResponse> call,
                                           @NonNull Response<ru.campus.app.data.model.MessageResponse> response) {
                        attendanceAdapter.setInteractionsEnabled(true);
                        if (response.isSuccessful()) {
                            if (present) presentIds.add(child.id); else presentIds.remove(child.id);
                            attendanceAdapter.setData(children, presentIds, true);
                            updatePresentCount();
                        } else {
                            attendanceAdapter.setData(children, presentIds, true); // откат галочки
                            Ui.showError(requireContext(), response);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<ru.campus.app.data.model.MessageResponse> call,
                                          @NonNull Throwable t) {
                        attendanceAdapter.setInteractionsEnabled(true);
                        attendanceAdapter.setData(children, presentIds, true);
                        Ui.showNetworkError(requireContext());
                    }
                });
    }

    private void updatePresentCount() {
        if (selectedEvent == null) {
            tvPresentCount.setText(R.string.journal_no_event);
        } else {
            tvPresentCount.setText(getString(R.string.journal_present_count,
                    presentIds.size(), children.size()));
        }
    }
}
