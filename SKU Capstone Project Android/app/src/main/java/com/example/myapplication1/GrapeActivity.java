package com.example.myapplication1;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class GrapeActivity extends AppCompatActivity {

    private LineChart sleepChart;

    private TextView tvSleepScore;
    private TextView tvStatusMsg;
    private TextView tvCurrentTemp;
    private TextView tvHumidity;
    private TextView tvNoise;

    private ImageButton btnBack;

    private ApiService apiService;
    private String userId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_grape);

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL + "/")
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);

        SharedPreferences pref =
                getSharedPreferences("UserPrefs", MODE_PRIVATE);

        userId = pref.getString("userEmail", "lkms1472");

        initViews();

        btnBack.setOnClickListener(v -> finish());

        loadEnvironmentHistory();
    }

    private void initViews() {

        sleepChart = findViewById(R.id.sleep_chart);

        tvSleepScore = findViewById(R.id.tv_sleep_score);
        tvStatusMsg = findViewById(R.id.tv_status_msg);

        tvCurrentTemp = findViewById(R.id.tv_current_temp);
        tvHumidity = findViewById(R.id.tv_humidity);
        tvNoise = findViewById(R.id.tv_noise);

        btnBack = findViewById(R.id.btn_back);
    }

    /**
     * 그래프 데이터 조회
     */
    private void loadEnvironmentHistory() {

        apiService.getTemhuHistory(userId)
                .enqueue(new Callback<List<AuthModels.TemperHistoryResponse>>() {

                    @Override
                    public void onResponse(
                            Call<List<AuthModels.TemperHistoryResponse>> call,
                            Response<List<AuthModels.TemperHistoryResponse>> response
                    ) {

                        if (
                                response.isSuccessful()
                                        && response.body() != null
                        ) {

                            Log.d(
                                    "GrapeActivity",
                                    "이력 데이터 수신: "
                                            + response.body().size()
                                            + "개"
                            );

                            updateChartUI(response.body());

                        } else {

                            Log.e(
                                    "GrapeActivity",
                                    "이력 응답 실패: "
                                            + response.code()
                            );
                        }
                    }

                    @Override
                    public void onFailure(
                            Call<List<AuthModels.TemperHistoryResponse>> call,
                            Throwable t
                    ) {

                        Log.e(
                                "GrapeActivity",
                                "이력 데이터 로드 실패: "
                                        + t.getMessage()
                        );
                    }
                });

        loadLatestStatus();
    }

    /**
     * 최신 온습도 + 수면점수 조회
     */
    private void loadLatestStatus() {

        apiService.getTemhuLatest(userId)
                .enqueue(new Callback<AuthModels.TemperHumilityResponse>() {

                    @Override
                    public void onResponse(
                            Call<AuthModels.TemperHumilityResponse> call,
                            Response<AuthModels.TemperHumilityResponse> response
                    ) {

                        if (
                                response.isSuccessful()
                                        && response.body() != null
                        ) {

                            AuthModels.TemperHumilityResponse data =
                                    response.body();

                            Log.d(
                                    "GrapeActivity",
                                    "최신 온도: "
                                            + data.temperature
                                            + ", 습도: "
                                            + data.humidity
                            );

                            /**
                             * 수면 점수
                             */
                            tvSleepScore.setText(
                                    data.sleepScore != null
                                            ? Math.round(data.sleepScore) + "점"
                                            : "--"
                            );

                            /**
                             * 온도
                             */
                            tvCurrentTemp.setText(
                                    String.format(
                                            "%.1f°C",
                                            data.temperature
                                    )
                            );

                            /**
                             * 습도
                             */
                            tvHumidity.setText(
                                    String.format(
                                            "%.0f%%",
                                            data.humidity
                                    )
                            );

                            /**
                             * 상태 메시지
                             */
                            if (
                                    data.sleepScore != null
                                            && data.sleepScore >= 80
                            ) {

                                tvStatusMsg.setText(
                                        "수면 환경이 매우 좋아요 😴"
                                );

                            } else if (
                                    data.sleepScore != null
                                            && data.sleepScore >= 60
                            ) {

                                tvStatusMsg.setText(
                                        "수면 환경이 안정적이에요 🙂"
                                );

                            } else {

                                tvStatusMsg.setText(
                                        "수면 환경 점검이 필요해요 ⚠️"
                                );
                            }

                        } else {

                            Log.e(
                                    "GrapeActivity",
                                    "최신 데이터 응답 실패: "
                                            + response.code()
                            );

                            tvCurrentTemp.setText("--°C");
                            tvHumidity.setText("--%");
                            tvSleepScore.setText("--");
                        }
                    }

                    @Override
                    public void onFailure(
                            Call<AuthModels.TemperHumilityResponse> call,
                            Throwable t
                    ) {

                        Log.e(
                                "GrapeActivity",
                                "최신 데이터 로드 실패: "
                                        + t.getMessage()
                        );

                        tvCurrentTemp.setText("--°C");
                        tvHumidity.setText("--%");
                        tvSleepScore.setText("--");
                    }
                });
    }

    /**
     * 수면점수 그래프 UI
     */
    private void updateChartUI(
            List<AuthModels.TemperHistoryResponse> dataList
    ) {

        if (dataList.isEmpty()) return;

        ArrayList<Entry> scoreEntries =
                new ArrayList<>();

        ArrayList<String> labels =
                new ArrayList<>();

        for (int i = 0; i < dataList.size(); i++) {

            AuthModels.TemperHistoryResponse data =
                    dataList.get(i);

            /**
             * 수면점수
             */
            float score =
                    data.sleepScore != null
                            ? data.sleepScore
                            : 0;

            scoreEntries.add(
                    new Entry(i, score)
            );

            /**
             * 시간 라벨
             */
            String timeLabel = data.time;

            if (
                    timeLabel != null
                            && timeLabel.length() > 16
            ) {

                timeLabel =
                        timeLabel.substring(11, 16);
            }

            labels.add(
                    timeLabel != null
                            ? timeLabel
                            : ""
            );
        }

        configureChart(scoreEntries, labels);
    }

    /**
     * 차트 설정
     */
    private void configureChart(
            ArrayList<Entry> entries,
            ArrayList<String> labels
    ) {

        LineDataSet dataSet =
                new LineDataSet(
                        entries,
                        "수면 점수 변화"
                );

        int themeColor =
                Color.parseColor("#4A90E2");

        dataSet.setColor(themeColor);

        dataSet.setCircleColor(themeColor);

        dataSet.setLineWidth(3f);

        dataSet.setCircleRadius(4f);

        dataSet.setDrawValues(false);

        dataSet.setMode(
                LineDataSet.Mode.CUBIC_BEZIER
        );

        LineData lineData =
                new LineData(dataSet);

        sleepChart.setData(lineData);

        /**
         * X축
         */
        XAxis xAxis =
                sleepChart.getXAxis();

        xAxis.setPosition(
                XAxis.XAxisPosition.BOTTOM
        );

        xAxis.setValueFormatter(
                new IndexAxisValueFormatter(labels)
        );

        xAxis.setGranularity(1f);

        xAxis.setLabelRotationAngle(-30);

        /**
         * 오른쪽 축 제거
         */
        sleepChart.getAxisRight()
                .setEnabled(false);

        /**
         * 설명 제거
         */
        sleepChart.getDescription()
                .setEnabled(false);

        /**
         * 애니메이션
         */
        sleepChart.animateX(1000);

        sleepChart.invalidate();
    }
}