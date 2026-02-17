package com.example.myapplication1;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;

public interface ApiService {

    // 1. 회원가입용 이메일 인증
    @POST("/auth/request-verify")
    Call<AuthModels.UserResponse> requestVerify(@Body AuthModels.VerifyRequest body);

    // 2. 비밀번호 재설정용 이메일 인증 (⭐ 반드시 필요)
    @POST("/auth/request-reset-verify")
    Call<AuthModels.UserResponse> requestResetVerify(@Body AuthModels.VerifyRequest body);

    // 3. 인증번호 확인
    @POST("/auth/verify-code")
    Call<AuthModels.UserResponse> verifyCode(@Body AuthModels.CodeCheckRequest body);

    // 4. 회원가입
    @POST("/auth/signup")
    Call<AuthModels.UserResponse> signup(@Body AuthModels.SignupRequest body);

    // 5. 로그인
    @POST("/auth/login")
    Call<AuthModels.UserResponse> login(@Body AuthModels.LoginRequest body);

    // 6. 토큰 갱신
    @POST("/auth/refresh")
    Call<AuthModels.UserResponse> refresh(@Body Map<String, String> refreshToken);

    // 7. 비밀번호 재설정
    @POST("/auth/reset-password")
    Call<AuthModels.UserResponse> resetPassword(@Body AuthModels.ResetPasswordRequest body);

    // ----------------------------

    @GET("/api/policies")
    Call<List<AuthModels.PolicyResponse>> getPolicies();

    @GET("/api/vaccines/schedule/{userId}")
    Call<List<AuthModels.VaccineResponse>> getVaccineSchedule(@Path("userId") String userId);

    @PUT("/auth/update-profile")
    Call<AuthModels.UserResponse> updateProfile(@Body AuthModels.UpdateProfileRequest body);

    // ApiService.java 예시
    @GET("/api/sleep/data")
    Call<List<AuthModels.SleepResponse>> getSleepData();
}
