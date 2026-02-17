package com.example.myapplication1;

import com.google.gson.annotations.SerializedName;

public class AuthModels {

    // 1. 이메일 인증번호 요청용 (email만 보냄)
    public static class VerifyRequest {
        String email;
        public VerifyRequest(String email) {
            this.email = email;
        }
    }

    // 2. 인증번호 코드 확인용 (email과 code 보냄)
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

        // 아기 생년월일 ("YYYY-MM-DD")
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

    // 6. 복지 정책 데이터 응답용 모델
    public static class PolicyResponse implements java.io.Serializable {
        @SerializedName("서비스명") public String title;
        @SerializedName("서비스요약") public String summary;
        @SerializedName("소관부처명") public String department;
        @SerializedName("소관조직명") public String subDepartment;
        @SerializedName("서비스URL") public String url;
    }

    // 7. 백신 스케줄 응답용 모델
    public static class VaccineResponse implements java.io.Serializable {
        @SerializedName("name") public String name;
        @SerializedName("degree") public int degree;
        @SerializedName("dueDate") public String dueDate;
        @SerializedName("dDay") public int dDay;
        @SerializedName("description") public String description;
    }

    // 8. 비밀번호 재설정 요청용
    public static class ResetPasswordRequest {
        String email;
        String newPassword;

        public ResetPasswordRequest(String email, String newPassword) {
            this.email = email;
            this.newPassword = newPassword;
        }
    }

    public static class UpdateProfileRequest {
        String email;     // 사용자 식별용 (변경 불가)
        String username;  // 변경할 이름
        String babyBirth; // 변경할 아기 생일 (yyyy-MM-dd)

        public UpdateProfileRequest(String email, String username, String babyBirth) {
            this.email = email;
            this.username = username;
            this.babyBirth = babyBirth;
        }
    }
    // 9. 아기 수면 및 환경 데이터 (시계열) 응답용 모델
    // AuthModels.java 내부
    public static class SleepResponse implements java.io.Serializable {
        @SerializedName("time") public String time;
        @SerializedName("temp") public float temp;
        @SerializedName("score") public float score;
        @SerializedName("status") public String status;
        @SerializedName("isEmergency") public boolean isEmergency;
    }
}
