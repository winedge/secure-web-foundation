
-- Fix the benchmark_aggregates view to use security_invoker
DROP VIEW IF EXISTS public.benchmark_aggregates;

CREATE VIEW public.benchmark_aggregates WITH (security_invoker = on) AS
SELECT
  period,
  tort_type,
  COUNT(*) AS firm_count,
  ROUND(AVG(avg_cpl)::numeric, 2) AS industry_avg_cpl,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_cpl)::numeric, 2) AS p25_cpl,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_cpl)::numeric, 2) AS p75_cpl,
  ROUND(AVG(avg_conversion_rate)::numeric, 4) AS industry_avg_conversion,
  ROUND(AVG(avg_case_value)::numeric, 2) AS industry_avg_case_value,
  ROUND(AVG(avg_response_time_minutes)::numeric, 0) AS industry_avg_response_time,
  ROUND(AVG(pipeline_velocity_days)::numeric, 1) AS industry_avg_pipeline_velocity
FROM public.firm_benchmarks
GROUP BY period, tort_type;
