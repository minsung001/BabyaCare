package com.example.myapplication1;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class AuthModels {

    // 1. 이메일 인증번호 요청용
    public static class VerifyRequest {
        String email;
        public VerifyRequest(String email) { this.email = email; }
    }

    // 2. 인증번호 코드 확인용
    public static class CodeCheckRequest {
        String email;
        String code;
        public CodeCheckRequest(String email, String code) {
            this.email = email;
            this.code = code;
        }
    }

    // 3. 회원가입용
    public static class SignupRequest {
        String email;
        String username;
        String password;
        boolean consent;
        String babyBirth;

        public SignupRequest(String email, String username, String password, boolean consent, String babyBirth) {
            this.email = email;
            this.username = username;
            this.password = password;
            this.consent = consent;
            this.babyBirth = babyBirth;
        }
    }

    // 4. 로그인용
    public static class LoginRequest {
        String username;
        String password;
        public LoginRequest(String username, String password) {
            this.username = username;
            this.password = password;
        }
    }

    // 5. 서버 공통 응답
    public static class UserResponse {
        @SerializedName("ok") public boolean ok;
        @SerializedName("message") public String message;
        @SerializedName("accessToken") public String accessToken;
        @SerializedName("refreshToken") public String refreshToken;
        @SerializedName("userId") public String userId;
    }

    // 6. 복지 정책 데이터 응답용
    public static class PolicyResponse implements java.io.Serializable {
        @SerializedName("서비스명") public String title;
        @SerializedName("서비스요약") public String summary;
        @SerializedName("소관부처명") public String department;
        @SerializedName("소관조직명") public String subDepartment;
        @SerializedName("서비스URL") public String url;
    }

    // 7. 백신 스케줄 응답 및 수정용
    public static class VaccineResponse implements java.io.Serializable {
        @SerializedName("_id") public String id;  // ✨ 추가: 서버 DB의 고유 ID (수정 시 필수)
        @SerializedName("name") public String name;
        @SerializedName("degree") public int degree;
        @SerializedName("dueDate") public String dueDate;
        @SerializedName("dDay") public int dDay;
        @SerializedName("description") public String description;
    }

    // ✨ [추가] 백신 일정 수정 요청용 DTO
    public static class VaccineUpdate {
        @SerializedName("dueDate") public String dueDate;

        public VaccineUpdate(String dueDate) {
            this.dueDate = dueDate;
        }
    }

    // 8. 비밀번호 재설정 및 프로필 수정
    public static class ResetPasswordRequest {
        String email;
        String newPassword;
        public ResetPasswordRequest(String email, String newPassword) {
            this.email = email;
            this.newPassword = newPassword;
        }
    }

    public static class UpdateProfileRequest {
        String email;
        String username;
        String babyBirth;
        public UpdateProfileRequest(String email, String username, String babyBirth) {
            this.email = email;
            this.username = username;
            this.babyBirth = babyBirth;
        }
    }

    // 9. 아기 수면 및 환경 데이터
    public static class SleepResponse implements java.io.Serializable {
        @SerializedName("time") public String time;
        @SerializedName("temp") public float temp;
        @SerializedName("humidity") public float humidity;
        @SerializedName("noise") public float noise;
        @SerializedName("score") public float score;
        @SerializedName("status") public String status;
        @SerializedName("isEmergency") public boolean isEmergency;
    }

    // ============================================================
    // 🚀 [SmartThings 연동 전용 신규 모델]
    // ============================================================

    // A. 토큰 등록 요청용 DTO
    public static class STTokenRequest {
        @SerializedName("email") public String email;
        @SerializedName("token") public String token;

        public STTokenRequest(String email, String token) {
            this.email = email;
            this.token = token;
        }
    }

    // B. 기기 목록 응답 통합 DTO
    public static class DeviceResponse {
        @SerializedName("ok") public boolean ok;
        @SerializedName("message") public String message;
        @SerializedName("devices") public List<Device> devices;
    }

    // C. 개별 기기 상세 정보
    public static class Device {
        @SerializedName("deviceId") public String deviceId;
        @SerializedName("name") public String name;
        @SerializedName("label") public String label;
    }
}