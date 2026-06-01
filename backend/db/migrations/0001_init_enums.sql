-- Auto-generated. MySQL 8 doesn't have first-class enums shared across tables;
-- we store enum-typed columns as VARCHAR + CHECK constraints (added per table).
-- Reference values per enum:

-- ENUM app_role: 'admin','firm_owner','firm_staff','claimant'
-- ENUM contact_status: 'new','contacted','qualified','nurturing','converted','lost','do_not_contact'
-- ENUM lead_source_type: 'csv_upload','google_ads','meta_ads','dialer','crm','intake_form','referral','other'
-- ENUM lead_status: 'available','purchased','expired','flagged','pending_review'
-- ENUM lead_tier: 'A','B','C','D'
-- ENUM subscription_plan: 'basic','premium'
-- ENUM team_permission: 'view_leads','manage_leads','view_campaigns','manage_campaigns','view_reports','manage_reports','view_wallet','manage_wallet','view_settings','manage_settings','view_meta_ads','manage_meta_ads','view_social','manage_social','manage_team','view_lead_contact_info','view_lead_case_details','view_lead_financials','view_session_logs','view_session_recordings'
-- ENUM touchpoint_type: 'call','email','sms','meeting','note','status_change','document','other'

-- (No DDL emitted here; see 0002 for column-level CHECKs.)
