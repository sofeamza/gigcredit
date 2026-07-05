GigCredit Test Data Pack

Standard daily CSV schema:
date,platform,jobs_completed,jobs_cancelled,total_earnings,hours_online,average_rating

Files:
01_valid_grab_daily_may_2026.csv - clean one-month Grab daily summary.
02_valid_multiplatform_3_months.csv - valid multi-platform data for platform diversity tests.
03_valid_long_history_12_months_with_old_data.csv - valid long dataset from 2025-07-01 to 2026-06-30, includes data older than 6 months.
04_valid_but_poor_performance.csv - valid schema but low earnings, lower ratings, higher cancellations.
05_invalid_missing_required_columns.csv - missing jobs_cancelled and hours_online.
06_invalid_negative_and_out_of_range_values.csv - negative jobs/earnings, hours > 24, rating > 5.
07_invalid_dates_and_duplicate_rows.csv - duplicate row and invalid date formats.
08_invalid_unsupported_platform_and_blanks.csv - unsupported platform, blank platform, missing jobs.
09_valid_monthly_summary_6_months.csv - valid monthly summary alternative schema.
10_invalid_malformed_file.csv - malformed content.

Suggested validation rules:
- date must be ISO format YYYY-MM-DD for daily data.
- platform must be one of Grab, ShopeeFood, Lalamove, Foodpanda.
- jobs_completed and jobs_cancelled must be integers >= 0.
- total_earnings and hours_online must be >= 0.
- hours_online should be <= 24 per day.
- average_rating should be blank or between 1 and 5.
- reject missing required columns.
- flag duplicate date+platform rows.
- flag history shorter than 3 or 6 months depending on your scoring policy.
