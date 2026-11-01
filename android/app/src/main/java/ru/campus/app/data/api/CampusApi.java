package ru.campus.app.data.api;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;
import ru.campus.app.data.model.*;

public interface CampusApi {

    @POST("api/v1/auth/login")
    Call<AuthResponse> login(@Body LoginRequest body);

    @POST("api/v1/auth/register")
    Call<RegisterResponse> register(@Body RegisterRequest body);

    @GET("api/v1/auth/verify-jwt")
    Call<Void> verifyJwt();

    @GET("api/v1/users/squad")
    Call<UserSquad> mySquad();

    @GET("api/v1/users/profile")
    Call<Profile> profile();

    @PUT("api/v1/users/profile")
    Call<Profile> updateProfile(@Body UpdateProfileRequest body);

    @PUT("api/v1/users/password")
    Call<MessageResponse> changePassword(@Body ChangePasswordRequest body);

    @GET("api/v1/squads/{squadId}/children")
    Call<SquadChildrenResponse> children(@Path("squadId") String squadId);

    @PUT("api/v1/children")
    Call<Child> updateChild(@Body UpdateChildRequest body);

    @GET("api/v1/events")
    Call<List<Event>> events(@Query("date") String date, @Query("limit") Integer limit);

    @GET("api/v1/events/{eventId}/attendance/{squadId}")
    Call<AttendanceResponse> attendance(@Path("eventId") String eventId, @Path("squadId") String squadId);

    @POST("api/v1/events/{eventId}/attendance")
    Call<MessageResponse> markAttendance(@Path("eventId") String eventId, @Body AttendanceRequest body);

    @GET("api/v1/notifications")
    Call<NotificationsResponse> notifications(@Query("limit") Integer limit);

    @POST("api/v1/notifications/read")
    Call<Void> readNotification(@Body ReadNotificationRequest body);

    @POST("api/v1/notifications/read-all")
    Call<MessageResponse> readAllNotifications();

    @GET("api/v1/chat/messages")
    Call<List<ChatMessage>> chatHistory(@Query("limit") Integer limit);

    @POST("api/v1/chat/messages")
    Call<ChatMessage> sendMessage(@Body SendMessageRequest body);

    @GET("api/v1/logs")
    Call<List<LogItem>> logs(@Query("limit") Integer limit);

    @GET("api/v1/applications")
    Call<List<Application>> applications(@Query("status") String status);

    @POST("api/v1/applications/{id}/approve")
    Call<Void> approveApplication(@Path("id") String id);

    @POST("api/v1/applications/{id}/reject")
    Call<Void> rejectApplication(@Path("id") String id, @Body RejectRequest body);

    @GET("api/v1/stats/shift")
    Call<ShiftStats> shiftStats();
}
