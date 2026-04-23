package com.example.myapplication1;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {

    // === 1. 인증 및 회원 관련 (Auth) ===

    @POST("/auth/request-verify")
    Call<AuthModels.UserResponse> requestVerify(@Body AuthModels.VerifyRequest body);

    @POST("/auth/request-reset-verify")
    Call<AuthModels.UserResponse> requestResetVerify(@Body AuthModels.VerifyRequest body);

    @POST("/auth/verify-code")
    Call<AuthModels.UserResponse> verifyCode(@Body AuthModels.CodeCheckRequest body);

    @POST("/auth/signup")
    Call<AuthModels.UserResponse> signup(@Body AuthModels.SignupRequest body);

    @POST("/auth/login")
    Call<AuthModels.UserResponse> login(@Body AuthModels.LoginRequest body);

    @POST("/auth/refresh")
    Call<AuthModels.UserResponse> refresh(@Body Map<String, String> refreshToken);

    @POST("/auth/reset-password")
    Call<AuthModels.UserResponse> resetPassword(@Body AuthModels.ResetPasswordRequest body);

    @PUT("/auth/update-profile")
    Call<AuthModels.UserResponse> updateProfile(@Body AuthModels.UpdateProfileRequest body);


    // === 2. 데이터 및 스케줄 관련 (Data) ===

    @GET("/api/policies")
    Call<List<AuthModels.PolicyResponse>> getPolicies();

    // 📅 백신 스케줄 조회
    @GET("/api/vaccines/schedule/{userId}")
    Call<List<AuthModels.VaccineResponse>> getVaccineSchedule(@Path("userId") String userId);

    // ✨ [추가] 백신 일정 수정 (PUT 방식)
    // vaccineId를 경로로 받고, 수정할 데이터를 VaccineUpdate 객체에 담아 보냅니다.
    @PUT("/api/vaccines/update/{vaccineId}")
    Call<Void> updateVaccine(
            @Path("vaccineId") String vaccineId,
            @Body AuthModels.VaccineUpdate request
    );

    @GET("/api/sleep/data")
    Call<List<AuthModels.SleepResponse>> getSleepData();


    // === 3. SmartThings 연동 관련 (IoT) ===

    @POST("/api/smartthings/register")
    Call<AuthModels.DeviceResponse> registerSTToken(
            @Header("Authorization") String jwtToken,
            @Body AuthModels.STTokenRequest request
    );

    @GET("/api/smartthings/devices")
    Call<AuthModels.DeviceResponse> getRegisteredDevices(
            @Header("Authorization") String jwtToken,
            @Query("email") String email
    );
}