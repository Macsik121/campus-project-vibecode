package ru.campus.app.ui.journal;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import ru.campus.app.R;
import ru.campus.app.common.TimeAgo;
import ru.campus.app.data.model.Event;

/** Список активностей: выбранная подсвечена; повторный тап снимает выбор */
public class EventsAdapter extends RecyclerView.Adapter<EventsAdapter.VH> {

    public interface OnEventClickListener { void onEventClick(Event event); }

    private final List<Event> events = new ArrayList<>();
    private final OnEventClickListener listener;
    private String selectedId;

    public EventsAdapter(OnEventClickListener listener) {
        this.listener = listener;
    }

    public void setEvents(List<Event> newEvents, Event selected) {
        events.clear();
        if (newEvents != null) events.addAll(newEvents);
        selectedId = selected != null ? selected.id : null;
        notifyDataSetChanged();
    }

    public List<Event> getEvents() { return events; }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_event, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Event event = events.get(position);
        h.title.setText(event.title);
        h.time.setText(TimeAgo.formatTime(event.timeFrom) + " – " + TimeAgo.formatTime(event.timeTo));
        h.description.setText(event.description != null ? event.description : "");
        h.root.setBackgroundResource(
                event.id.equals(selectedId) ? R.drawable.bg_event_selected : R.drawable.bg_event_normal);
        h.itemView.setOnClickListener(v -> listener.onEventClick(event));
    }

    @Override
    public int getItemCount() { return events.size(); }

    static class VH extends RecyclerView.ViewHolder {
        final View root;
        final TextView title, time, description;

        VH(@NonNull View itemView) {
            super(itemView);
            root = itemView.findViewById(R.id.eventRoot);
            title = itemView.findViewById(R.id.tvEventTitle);
            time = itemView.findViewById(R.id.tvEventTime);
            description = itemView.findViewById(R.id.tvEventDescription);
        }
    }
}
