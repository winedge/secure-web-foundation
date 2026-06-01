-- Auto-generated CREATE TABLE statements (no FKs; see 0003).
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `admin_settings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `key` TEXT NOT NULL,
  `value` JSON NOT NULL DEFAULT ('{}'),
  `description` TEXT,
  `updated_by` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_settings_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_case_evaluations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `viability_score` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `settlement_estimate_low` DECIMAL(20,6),
  `settlement_estimate_high` DECIMAL(20,6),
  `strengths` JSON DEFAULT ('{}'),
  `weaknesses` JSON DEFAULT ('{}'),
  `recommendations` JSON DEFAULT ('{}'),
  `jurisdiction_notes` TEXT,
  `statute_of_limitations` TEXT,
  `similar_cases_summary` TEXT,
  `evaluation_details` JSON DEFAULT ('{}'),
  `model_version` TEXT DEFAULT ('v1'),
  `evaluated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_case_evaluations_lead_id_firm_id_key` (`lead_id`, `firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_decision_consents` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `lead_id` CHAR(36),
  `transparency_log_id` CHAR(36),
  `action_type` TEXT NOT NULL,
  `acknowledged_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address` TEXT,
  `user_agent` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_feedback` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36),
  `action_type` TEXT NOT NULL,
  `recommendation` JSON,
  `rating` TEXT,
  `feedback_text` TEXT,
  `was_applied` TINYINT(1) DEFAULT 0,
  `outcome_metrics` JSON,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_lead_scores` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `conversion_probability` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `recommended_action` TEXT,
  `scoring_factors` JSON DEFAULT ('{}'),
  `optimal_contact_time` TEXT,
  `predicted_value` DECIMAL(20,6),
  `model_version` TEXT DEFAULT ('v1'),
  `scored_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_lead_scores_lead_id_firm_id_key` (`lead_id`, `firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_performance_snapshots` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36),
  `tort_type` TEXT,
  `target_states` JSON,
  `snapshot_type` TEXT NOT NULL,
  `metrics` JSON NOT NULL,
  `ai_action_applied` TEXT,
  `captured_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_seo_runs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tool` TEXT NOT NULL,
  `firm_id` CHAR(36),
  `user_id` CHAR(36),
  `input` JSON NOT NULL DEFAULT ('{}'),
  `output` JSON NOT NULL DEFAULT ('{}'),
  `model` TEXT,
  `status` TEXT NOT NULL DEFAULT ('completed'),
  `error` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_tool_results` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `tool_key` TEXT NOT NULL,
  `vertical_slug` TEXT,
  `input_text` TEXT,
  `input_file_url` TEXT,
  `input_file_name` TEXT,
  `output_text` TEXT,
  `output_data` JSON,
  `status` TEXT NOT NULL DEFAULT ('completed'),
  `error_message` TEXT,
  `model_used` TEXT,
  `tokens_used` INT,
  `duration_ms` INT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_transparency_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36),
  `firm_id` CHAR(36),
  `action_type` TEXT NOT NULL,
  `model_name` TEXT NOT NULL,
  `model_version` TEXT,
  `input_summary` TEXT,
  `output_summary` TEXT,
  `confidence_score` DECIMAL(20,6),
  `decision_factors` JSON,
  `processing_time_ms` INT,
  `compliant_frameworks` JSON,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alert_notifications` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `alert_rule_id` CHAR(36),
  `user_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `title` TEXT NOT NULL,
  `message` TEXT NOT NULL,
  `severity` TEXT DEFAULT ('info'),
  `is_read` TINYINT(1) DEFAULT 0,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alert_rules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `rule_type` TEXT NOT NULL,
  `conditions` JSON NOT NULL DEFAULT ('{}'),
  `is_active` TINYINT(1) DEFAULT 1,
  `notify_email` TINYINT(1) DEFAULT 1,
  `notify_in_app` TINYINT(1) DEFAULT 1,
  `last_triggered_at` DATETIME(6),
  `trigger_count` INT DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audience_profiles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `tort_type` TEXT,
  `seed_data` JSON DEFAULT ('{}'),
  `demographics` JSON DEFAULT ('{}'),
  `psychographics` JSON DEFAULT ('{}'),
  `behavioral_signals` JSON DEFAULT ('{}'),
  `estimated_reach` INT,
  `match_quality` DECIMAL(20,6),
  `synced_platforms` JSON,
  `status` TEXT DEFAULT ('building'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36),
  `action` TEXT NOT NULL,
  `entity_type` TEXT NOT NULL,
  `entity_id` CHAR(36),
  `details` JSON,
  `ip_address` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `autopilot_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `rule_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36),
  `action_taken` TEXT NOT NULL,
  `details` JSON,
  `ai_reasoning` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `autopilot_rules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36),
  `rule_type` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `conditions` JSON NOT NULL,
  `actions` JSON NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `last_triggered_at` DATETIME(6),
  `trigger_count` INT DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `budget_reallocation_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL,
  `from_ad_set_id` CHAR(36),
  `to_ad_set_id` CHAR(36),
  `from_budget` DECIMAL(20,6),
  `to_budget` DECIMAL(20,6),
  `amount_moved` DECIMAL(20,6),
  `reason` TEXT,
  `ai_confidence` DECIMAL(20,6),
  `applied` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `tort_type` TEXT NOT NULL,
  `target_states` JSON DEFAULT ('{}'),
  `target_age_min` INT,
  `target_age_max` INT,
  `daily_budget` DECIMAL(20,6),
  `total_budget` DECIMAL(20,6),
  `status` TEXT DEFAULT ('draft'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ad_headline` TEXT,
  `ad_body` TEXT,
  `ad_cta` TEXT,
  `emotional_angle` TEXT,
  `target_hook` TEXT,
  `best_platform` TEXT,
  `ab_test_hypothesis` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `case_simulations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `lead_id` CHAR(36),
  `judge_id` CHAR(36),
  `tort_type` TEXT NOT NULL,
  `jurisdiction` TEXT NOT NULL,
  `simulation_results` JSON NOT NULL DEFAULT ('{}'),
  `win_probability` DECIMAL(20,6),
  `settlement_range_low` DECIMAL(20,6),
  `settlement_range_high` DECIMAL(20,6),
  `recommended_strategy` TEXT,
  `simulated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `category_select_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_slug` TEXT NOT NULL,
  `vertical_name` TEXT,
  `state` TEXT NOT NULL,
  `is_missing` TINYINT(1) NOT NULL DEFAULT 0,
  `category_count` INT NOT NULL DEFAULT 0,
  `allow_free_text_fallback` TINYINT(1) NOT NULL DEFAULT 1,
  `firm_id` CHAR(36),
  `user_id` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_conversations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36),
  `type` TEXT NOT NULL DEFAULT ('team'),
  `name` TEXT,
  `created_by` CHAR(36) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `conversation_id` CHAR(36) NOT NULL,
  `sender_id` CHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_participants` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `conversation_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `last_read_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `joined_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `chat_participants_conversation_id_user_id_key` (`conversation_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `competitor_ad_creatives` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `run_id` CHAR(36) NOT NULL,
  `creative_id` TEXT,
  `format` TEXT,
  `headline` TEXT,
  `body` TEXT,
  `media_url` TEXT,
  `destination_url` TEXT,
  `first_seen` DATE,
  `last_seen` DATE,
  `regions` JSON,
  `transparency_url` TEXT,
  `raw` JSON,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `competitor_ad_runs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36),
  `brand` TEXT,
  `domain` TEXT,
  `region` TEXT NOT NULL DEFAULT ('IN'),
  `date_range` TEXT DEFAULT ('30d'),
  `formats` JSON,
  `advertiser_id` TEXT,
  `advertiser_url` TEXT,
  `status` TEXT NOT NULL DEFAULT ('pending'),
  `ai_summary` JSON,
  `error_message` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `consent_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36),
  `consent_type` TEXT NOT NULL,
  `consented` TINYINT(1) NOT NULL,
  `ip_address` TEXT,
  `user_agent` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contacts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36),
  `lead_id` CHAR(36),
  `first_name` TEXT,
  `last_name` TEXT,
  `email` TEXT,
  `phone` TEXT,
  `address` TEXT,
  `city` TEXT,
  `state` TEXT,
  `zip_code` TEXT,
  `status` VARCHAR(64) DEFAULT 'new' /* enum:contact_status */,
  `source_id` CHAR(36),
  `external_id` TEXT,
  `duplicate_of` CHAR(36),
  `is_duplicate` TINYINT(1) DEFAULT 0,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `creative_studio_projects` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `brief` TEXT,
  `tort_type` TEXT,
  `target_audience` TEXT,
  `brand_tone` TEXT,
  `generated_variants` JSON DEFAULT ('[]'),
  `best_performer_id` TEXT,
  `status` TEXT DEFAULT ('draft'),
  `ai_score` DECIMAL(20,6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_integrations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `crm_type` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `config` JSON DEFAULT ('{}'),
  `is_active` TINYINT(1) DEFAULT 0,
  `last_sync_at` DATETIME(6),
  `sync_frequency` TEXT DEFAULT ('realtime'),
  `field_mapping` JSON DEFAULT ('{}'),
  `total_synced` INT DEFAULT 0,
  `total_failed` INT DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_sync_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `integration_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `lead_id` CHAR(36),
  `sync_type` TEXT NOT NULL DEFAULT ('push'),
  `status` TEXT NOT NULL DEFAULT ('pending'),
  `crm_record_id` TEXT,
  `error_message` TEXT,
  `request_payload` JSON,
  `response_payload` JSON,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cross_platform_campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `tort_type` TEXT,
  `total_budget` DECIMAL(20,6),
  `platform_allocation` JSON DEFAULT ('{"meta": 0.4, "google": 0.3, "tiktok": 0.2, "linkedin": 0.1}'),
  `ai_optimized_allocation` JSON,
  `platforms_active` JSON DEFAULT ('{meta}'),
  `status` TEXT DEFAULT ('draft'),
  `performance_summary` JSON DEFAULT ('{}'),
  `last_optimization_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dark_funnel_visitors` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `visitor_hash` TEXT NOT NULL,
  `touchpoints` JSON DEFAULT ('[]'),
  `estimated_intent` DECIMAL(20,6) DEFAULT 0,
  `tort_interest` TEXT,
  `device_type` TEXT,
  `geographic_region` TEXT,
  `first_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `converted` TINYINT(1) DEFAULT 0,
  `lead_id` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_analyses` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36),
  `firm_id` CHAR(36) NOT NULL,
  `file_name` TEXT NOT NULL,
  `file_url` TEXT NOT NULL,
  `document_type` TEXT DEFAULT ('other'),
  `extracted_facts` JSON DEFAULT ('[]'),
  `statute_risks` JSON DEFAULT ('[]'),
  `auto_populated_fields` JSON DEFAULT ('{}'),
  `ai_summary` TEXT,
  `status` TEXT DEFAULT ('pending'),
  `analyzed_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_signatures` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36),
  `firm_id` CHAR(36) NOT NULL,
  `signer_name` TEXT NOT NULL,
  `signer_email` TEXT,
  `signer_role` TEXT DEFAULT ('client'),
  `signature_data` TEXT NOT NULL,
  `document_name` TEXT NOT NULL,
  `document_content` TEXT,
  `ip_address` TEXT,
  `user_agent` TEXT,
  `signed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` CHAR(36) NOT NULL,
  `status` TEXT NOT NULL DEFAULT ('signed'),
  `sha256_hash` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dynamic_landing_pages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36),
  `slug` TEXT NOT NULL,
  `page_title` TEXT NOT NULL,
  `headline` TEXT,
  `subheadline` TEXT,
  `cta_text` TEXT DEFAULT ('Get Free Consultation'),
  `cta_color` TEXT,
  `sections` JSON DEFAULT ('[]'),
  `personalization_rules` JSON DEFAULT ('{}'),
  `conversion_rate` DECIMAL(20,6) DEFAULT 0,
  `visits` INT DEFAULT 0,
  `conversions` INT DEFAULT 0,
  `is_published` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `evidence_audit_trail` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `evidence_id` CHAR(36) NOT NULL,
  `action` TEXT NOT NULL,
  `actor_id` CHAR(36) NOT NULL,
  `ip_address` TEXT,
  `details` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `evidence_vault` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `lead_id` CHAR(36),
  `file_name` TEXT NOT NULL,
  `file_url` TEXT NOT NULL,
  `file_size` BIGINT,
  `mime_type` TEXT,
  `sha256_hash` TEXT NOT NULL,
  `previous_hash` TEXT,
  `chain_position` INT NOT NULL DEFAULT 1,
  `uploaded_by` CHAR(36) NOT NULL,
  `metadata` JSON DEFAULT ('{}'),
  `integrity_verified` TINYINT(1) DEFAULT 1,
  `verified_at` DATETIME(6),
  `tamper_detected` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `filter_rejection_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36),
  `firm_id` CHAR(36),
  `vertical_slug` TEXT,
  `field` TEXT NOT NULL,
  `rejected_value` TEXT,
  `reason` TEXT NOT NULL,
  `context` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_benchmarks` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `period` TEXT NOT NULL,
  `tort_type` TEXT,
  `avg_cpl` DECIMAL(20,6),
  `avg_conversion_rate` DECIMAL(20,6),
  `avg_case_value` DECIMAL(20,6),
  `total_leads_purchased` INT,
  `total_spend` DECIMAL(20,6),
  `avg_response_time_minutes` INT,
  `pipeline_velocity_days` DECIMAL(20,6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_branding` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `slug` TEXT NOT NULL,
  `logo_url` TEXT,
  `firm_display_name` TEXT,
  `primary_color` TEXT DEFAULT ('#0f172a'),
  `background_color` TEXT DEFAULT ('#ffffff'),
  `accent_color` TEXT DEFAULT ('#10b981'),
  `heading_text` TEXT DEFAULT ('Submit Your Claim'),
  `description_text` TEXT DEFAULT ('Fill out the form below to get started with your case evaluation.'),
  `custom_fields` JSON DEFAULT ('[]'),
  `visible_fields` JSON DEFAULT ('["first_name", "last_name", "email", "phone", "state", "tort_type", "diagnosis_details", "exposure_details"]'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `chatbot_enabled` TINYINT(1) DEFAULT 1,
  `chatbot_agent_name` TEXT DEFAULT ('AI Intake Assistant'),
  `chatbot_avatar_url` TEXT,
  `theme_key` TEXT,
  `typography` JSON NOT NULL DEFAULT ('{}'),
  `layout_config` JSON NOT NULL DEFAULT ('{}'),
  `hero_config` JSON NOT NULL DEFAULT ('{}'),
  `trust_signals` JSON NOT NULL DEFAULT ('[]'),
  `testimonials` JSON NOT NULL DEFAULT ('[]'),
  `seo_config` JSON NOT NULL DEFAULT ('{}'),
  `sections` JSON NOT NULL DEFAULT ('[]'),
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `published_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `firm_branding_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_encryption_keys` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `encrypted_master_key` TEXT NOT NULL,
  `key_salt` TEXT NOT NULL,
  `algorithm` TEXT NOT NULL DEFAULT ('AES-256-GCM+ML-KEM-1024'),
  `pqc_public_key` TEXT,
  `key_version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `firm_encryption_keys_firm_id_user_id_key` (`firm_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_members` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `is_owner` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `firm_members_firm_id_user_id_key` (`firm_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firms` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `website` TEXT,
  `states` JSON DEFAULT ('{}'),
  `practice_type` TEXT,
  `contact_email` TEXT,
  `contact_phone` TEXT,
  `stripe_customer_id` TEXT,
  `subscription_plan` VARCHAR(64) DEFAULT 'basic' /* enum:subscription_plan */,
  `subscription_status` TEXT DEFAULT ('inactive'),
  `wallet_balance` DECIMAL(20,6) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `vertical_id` CHAR(36),
  `vertical_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `country` TEXT NOT NULL DEFAULT ('US'),
  `categories` JSON NOT NULL DEFAULT ('{}'),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fraud_checks` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `check_type` TEXT NOT NULL,
  `severity` TEXT NOT NULL DEFAULT ('medium'),
  `details` JSON DEFAULT ('{}'),
  `is_confirmed` TINYINT(1) DEFAULT 0,
  `reviewed_by` CHAR(36),
  `reviewed_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `geofence_campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `tort_type` TEXT,
  `locations` JSON NOT NULL DEFAULT ('[]'),
  `radius_meters` INT DEFAULT 500,
  `ad_creative` JSON DEFAULT ('{}'),
  `is_active` TINYINT(1) DEFAULT 0,
  `impressions` INT DEFAULT 0,
  `clicks` INT DEFAULT 0,
  `conversions` INT DEFAULT 0,
  `daily_budget` DECIMAL(20,6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_account_links` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `google_account_id` TEXT NOT NULL,
  `pubsub_topic` TEXT,
  `email` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `gmb_account_links_google_account_id_key` (`google_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_locations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `place_id` TEXT,
  `name` TEXT NOT NULL,
  `address` TEXT,
  `city` TEXT,
  `region` TEXT,
  `postal_code` TEXT,
  `country` TEXT,
  `phone` TEXT,
  `website` TEXT,
  `primary_category` TEXT,
  `hours` JSON DEFAULT ('{}'),
  `status` TEXT NOT NULL DEFAULT ('draft'),
  `is_connected` TINYINT(1) NOT NULL DEFAULT 0,
  `last_synced_at` DATETIME(6),
  `raw_payload` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `google_account_id` TEXT,
  `google_location_id` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_oauth_consents` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `disclosure_version` TEXT NOT NULL,
  `disclosure_sha256` TEXT NOT NULL,
  `scopes` JSON NOT NULL DEFAULT ('{}'),
  `purposes` JSON NOT NULL DEFAULT ('{}'),
  `data_categories` JSON NOT NULL DEFAULT ('{}'),
  `retention_days` INT NOT NULL DEFAULT 365,
  `ip_address` TEXT,
  `user_agent` TEXT,
  `consented` TINYINT(1) NOT NULL DEFAULT 1,
  `revoked_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_posts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `location_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `post_type` TEXT NOT NULL DEFAULT ('update'),
  `summary` TEXT NOT NULL,
  `media_url` TEXT,
  `cta_label` TEXT,
  `cta_url` TEXT,
  `scheduled_for` DATETIME(6),
  `status` TEXT NOT NULL DEFAULT ('draft'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_reply_templates` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `body` TEXT NOT NULL,
  `tone` TEXT NOT NULL DEFAULT ('professional'),
  `rating_filter` INT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_review_replies` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `review_id` CHAR(36) NOT NULL,
  `template_id` CHAR(36),
  `body` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT ('draft'),
  `ai_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `ai_model` TEXT,
  `created_by` CHAR(36),
  `approved_by` CHAR(36),
  `approved_at` DATETIME(6),
  `rejected_reason` TEXT,
  `sent_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_reviews` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `location_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `reviewer_name` TEXT,
  `rating` INT,
  `text` TEXT,
  `reply_text` TEXT,
  `replied_at` DATETIME(6),
  `external_id` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reply_status` TEXT NOT NULL DEFAULT ('none'),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_sync_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `location_id` CHAR(36),
  `sync_type` TEXT NOT NULL DEFAULT ('full'),
  `status` TEXT NOT NULL DEFAULT ('pending'),
  `reviews_synced` INT NOT NULL DEFAULT 0,
  `posts_synced` INT NOT NULL DEFAULT 0,
  `insights_synced` INT NOT NULL DEFAULT 0,
  `error_message` TEXT,
  `error_code` TEXT,
  `duration_ms` INT,
  `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `completed_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `industry_verticals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `slug` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `icon` TEXT,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `industry_verticals_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `intent_signals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tort_type` TEXT NOT NULL,
  `state` TEXT,
  `signal_source` TEXT NOT NULL,
  `keyword` TEXT,
  `volume_change_pct` DECIMAL(20,6),
  `intensity` DECIMAL(20,6) DEFAULT 0,
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `recommended_action` TEXT,
  `ai_analysis` JSON,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `journey_data` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `contact_id` CHAR(36) NOT NULL,
  `stage` TEXT NOT NULL,
  `entered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `exited_at` DATETIME(6),
  `duration_seconds` INT,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `judge_profiles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `judge_name` TEXT NOT NULL,
  `court` TEXT,
  `jurisdiction` TEXT NOT NULL,
  `state` TEXT,
  `appointment_year` INT,
  `ruling_history` JSON DEFAULT ('{}'),
  `sentiment_profile` JSON DEFAULT ('{}'),
  `avg_settlement_modifier` DECIMAL(20,6),
  `plaintiff_win_rate` DECIMAL(20,6),
  `avg_case_duration_days` INT,
  `notable_rulings` JSON DEFAULT ('[]'),
  `tort_specialties` JSON,
  `ai_strategy_notes` TEXT,
  `last_analyzed_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_design_presets` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `name` TEXT NOT NULL,
  `background` JSON NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_domains` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `hostname` TEXT NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_token` TEXT NOT NULL DEFAULT (encode(extensions.gen_random_bytes(16), 'hex')),
  `status` TEXT NOT NULL DEFAULT ('pending'),
  `ssl_status` TEXT NOT NULL DEFAULT ('pending'),
  `last_checked_at` DATETIME(6),
  `verified_at` DATETIME(6),
  `notes` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `landing_page_domains_hostname_key` (`hostname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_previews` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `version_id` CHAR(36) NOT NULL,
  `token` TEXT NOT NULL,
  `expires_at` DATETIME(6) NOT NULL DEFAULT (now() + '7 days'),
  `view_count` INT NOT NULL DEFAULT 0,
  `created_by` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `landing_page_previews_token_key` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_templates` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `name` TEXT NOT NULL,
  `description` TEXT,
  `category` TEXT DEFAULT ('general'),
  `tags` JSON DEFAULT ('{}'),
  `thumbnail_url` TEXT,
  `is_public` TINYINT(1) NOT NULL DEFAULT 0,
  `snapshot` JSON NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `vertical_slug` TEXT,
  `is_starter` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_versions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `label` TEXT,
  `note` TEXT,
  `created_by` CHAR(36),
  `snapshot` JSON NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_activity_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36),
  `activity_type` TEXT NOT NULL,
  `title` TEXT NOT NULL,
  `description` TEXT,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_blockchain` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `block_number` INT NOT NULL,
  `event_type` TEXT NOT NULL,
  `event_data` JSON NOT NULL DEFAULT ('{}'),
  `actor_id` CHAR(36),
  `sha256_hash` TEXT NOT NULL,
  `previous_hash` TEXT,
  `nonce` TEXT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `integrity_status` TEXT DEFAULT ('valid'),
  `last_verified_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lead_blockchain_lead_id_block_number_key` (`lead_id`, `block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_purchases` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36),
  `amount` DECIMAL(20,6) NOT NULL,
  `payment_method` TEXT,
  `stripe_payment_id` TEXT,
  `purchased_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `pipeline_stage` TEXT NOT NULL DEFAULT ('new_lead'),
  `stage_updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_referrals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `referring_firm_id` CHAR(36) NOT NULL,
  `referred_to_firm_id` CHAR(36),
  `referral_fee` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `status` TEXT DEFAULT ('listed'),
  `reason` TEXT,
  `notes` TEXT,
  `accepted_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_sources` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `source_type` VARCHAR(64) NOT NULL /* enum:lead_source_type */,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `configuration` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_statuses` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `contact_id` CHAR(36),
  `status` TEXT NOT NULL,
  `previous_status` TEXT,
  `changed_by` CHAR(36),
  `change_reason` TEXT,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `leads` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36),
  `tort_type` TEXT NOT NULL,
  `state` TEXT NOT NULL,
  `age_bucket` TEXT,
  `ai_quality_score` INT,
  `fraud_risk_score` INT,
  `tier` VARCHAR(64) NOT NULL DEFAULT 'C' /* enum:lead_tier */,
  `is_verified` TINYINT(1) DEFAULT 0,
  `is_exclusive` TINYINT(1) DEFAULT 1,
  `price` DECIMAL(20,6) NOT NULL,
  `status` VARCHAR(64) DEFAULT 'available' /* enum:lead_status */,
  `first_name` TEXT,
  `last_name` TEXT,
  `email` TEXT,
  `phone` TEXT,
  `address` TEXT,
  `city` TEXT,
  `zip_code` TEXT,
  `diagnosis_details` TEXT,
  `exposure_details` TEXT,
  `documents_url` JSON,
  `consent_tcpa` TINYINT(1) DEFAULT 0,
  `consent_hipaa` TINYINT(1) DEFAULT 0,
  `consent_privacy` TINYINT(1) DEFAULT 0,
  `source` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `source_id` CHAR(36),
  `external_id` TEXT,
  `is_duplicate` TINYINT(1) DEFAULT 0,
  `duplicate_of` CHAR(36),
  `ingested_at` DATETIME(6),
  `metadata` JSON DEFAULT ('{}'),
  `session_recording_url` TEXT,
  `vertical_id` CHAR(36),
  `category` TEXT,
  `custom_fields` JSON NOT NULL DEFAULT ('{}'),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `market_pulse_alerts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `title` TEXT NOT NULL,
  `description` TEXT,
  `tort_type` TEXT,
  `source_type` TEXT NOT NULL DEFAULT ('news'),
  `source_url` TEXT,
  `severity` TEXT NOT NULL DEFAULT ('medium'),
  `affected_states` JSON,
  `estimated_market_size` TEXT,
  `competition_level` TEXT,
  `ai_confidence` DECIMAL(20,6) DEFAULT 0,
  `ai_analysis` JSON,
  `is_trending` TINYINT(1) DEFAULT 0,
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `market_pulse_watchlist` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `keywords` JSON NOT NULL DEFAULT ('{}'),
  `tort_types` JSON NOT NULL DEFAULT ('{}'),
  `states` JSON NOT NULL DEFAULT ('{}'),
  `notify_email` TINYINT(1) DEFAULT 1,
  `notify_in_app` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_ad_sets` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT ('draft'),
  `daily_budget` DECIMAL(20,6) DEFAULT 0,
  `targeting` JSON DEFAULT ('{}'),
  `age_min` INT DEFAULT 18,
  `age_max` INT DEFAULT 65,
  `genders` JSON DEFAULT ('{all}'),
  `locations` JSON DEFAULT ('[]'),
  `interests` JSON DEFAULT ('[]'),
  `lookalike_audience_id` TEXT,
  `custom_audience_id` TEXT,
  `placement_type` TEXT DEFAULT ('automatic'),
  `placements` JSON DEFAULT ('{facebook_feed,instagram_feed,audience_network}'),
  `optimization_event` TEXT DEFAULT ('LEAD'),
  `bid_amount` DECIMAL(20,6),
  `meta_adset_id` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_ads` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `ad_set_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT ('draft'),
  `headline` TEXT,
  `body_text` TEXT,
  `description` TEXT,
  `call_to_action` TEXT DEFAULT ('LEARN_MORE'),
  `image_url` TEXT,
  `video_url` TEXT,
  `link_url` TEXT,
  `display_link` TEXT,
  `creative_type` TEXT DEFAULT ('image'),
  `ai_generated` TINYINT(1) DEFAULT 0,
  `ai_score` DECIMAL(20,6),
  `meta_ad_id` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_ai_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL,
  `action_type` TEXT NOT NULL,
  `description` TEXT,
  `recommendation` JSON DEFAULT ('{}'),
  `applied` TINYINT(1) DEFAULT 0,
  `applied_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_campaign_analytics` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL,
  `ad_set_id` CHAR(36),
  `ad_id` CHAR(36),
  `date` DATE NOT NULL DEFAULT CURRENT_DATE,
  `impressions` INT DEFAULT 0,
  `clicks` INT DEFAULT 0,
  `conversions` INT DEFAULT 0,
  `leads` INT DEFAULT 0,
  `spend` DECIMAL(20,6) DEFAULT 0,
  `cpc` DECIMAL(20,6) DEFAULT 0,
  `cpm` DECIMAL(20,6) DEFAULT 0,
  `ctr` DECIMAL(20,6) DEFAULT 0,
  `cpl` DECIMAL(20,6) DEFAULT 0,
  `reach` INT DEFAULT 0,
  `frequency` DECIMAL(20,6) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `objective` TEXT NOT NULL DEFAULT ('LEAD_GENERATION'),
  `status` TEXT NOT NULL DEFAULT ('draft'),
  `daily_budget` DECIMAL(20,6) DEFAULT 0,
  `lifetime_budget` DECIMAL(20,6) DEFAULT 0,
  `start_date` DATETIME(6),
  `end_date` DATETIME(6),
  `bid_strategy` TEXT DEFAULT ('LOWEST_COST'),
  `optimization_goal` TEXT DEFAULT ('LEAD'),
  `ai_recommendations` JSON DEFAULT ('{}'),
  `meta_campaign_id` TEXT,
  `tort_type` TEXT,
  `target_states` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notes` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36),
  `contact_id` CHAR(36),
  `firm_id` CHAR(36),
  `user_id` CHAR(36),
  `title` TEXT,
  `content` TEXT NOT NULL,
  `is_pinned` TINYINT(1) DEFAULT 0,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_preferences` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `notify_new_leads` TINYINT(1) NOT NULL DEFAULT 1,
  `notify_email` TEXT,
  `tort_types` JSON DEFAULT ('{}'),
  `states` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_preferences_firm_id_key` (`firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pipeline_charges` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `from_stage` TEXT NOT NULL,
  `to_stage` TEXT NOT NULL,
  `amount` DECIMAL(20,6) NOT NULL,
  `payment_method` TEXT NOT NULL DEFAULT ('wallet'),
  `stripe_session_id` TEXT,
  `status` TEXT NOT NULL DEFAULT ('completed'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `platform_connections` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `platform` TEXT NOT NULL,
  `platform_user_id` TEXT,
  `platform_username` TEXT,
  `access_token` TEXT,
  `refresh_token` TEXT,
  `token_expires_at` DATETIME(6),
  `page_id` TEXT,
  `page_name` TEXT,
  `page_access_token` TEXT,
  `permissions` JSON,
  `is_active` TINYINT(1) DEFAULT 1,
  `metadata` JSON DEFAULT ('{}'),
  `connected_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `predictive_lead_signals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tort_type` TEXT NOT NULL,
  `state` TEXT NOT NULL,
  `signal_type` TEXT NOT NULL,
  `signal_strength` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `predicted_volume` INT,
  `predicted_timeframe` TEXT,
  `confidence` DECIMAL(20,6) DEFAULT 0,
  `data_sources` JSON DEFAULT ('[]'),
  `ai_reasoning` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `profiles` (
  `id` CHAR(36) NOT NULL,
  `email` TEXT NOT NULL,
  `full_name` TEXT,
  `avatar_url` TEXT,
  `phone` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `onboarding_completed` TINYINT(1) DEFAULT 0,
  `onboarding_step` INT DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `recovery_codes` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `code_hash` TEXT NOT NULL,
  `used_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `source` TEXT NOT NULL DEFAULT ('totp'),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `report_schedules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `created_by` CHAR(36) NOT NULL,
  `report_type` TEXT NOT NULL DEFAULT ('meta_performance'),
  `frequency` TEXT NOT NULL DEFAULT ('weekly'),
  `emails` JSON NOT NULL DEFAULT ('{}'),
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_sent_at` DATETIME(6),
  `next_send_at` DATETIME(6),
  `config` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_module_permissions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `role` TEXT NOT NULL,
  `module_key` TEXT NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_module_permissions_role_module_key_key` (`role`, `module_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seo_issues` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `scan_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `severity` TEXT NOT NULL DEFAULT ('info'),
  `category` TEXT NOT NULL,
  `page_url` TEXT,
  `message` TEXT NOT NULL,
  `recommendation` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seo_scans` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `url` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT ('pending'),
  `overall_score` INT,
  `pages_crawled` INT DEFAULT 0,
  `errors_count` INT DEFAULT 0,
  `warnings_count` INT DEFAULT 0,
  `summary` JSON DEFAULT ('{}'),
  `raw_report` JSON DEFAULT ('{}'),
  `error_message` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `completed_at` DATETIME(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seo_thresholds` (
  `firm_id` CHAR(36) NOT NULL,
  `title_min` INT NOT NULL DEFAULT 30,
  `title_max` INT NOT NULL DEFAULT 60,
  `description_min` INT NOT NULL DEFAULT 50,
  `description_max` INT NOT NULL DEFAULT 160,
  `word_count_min` INT NOT NULL DEFAULT 300,
  `h1_max` INT NOT NULL DEFAULT 1,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` CHAR(36),
  PRIMARY KEY (`firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_posts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36),
  `user_id` CHAR(36) NOT NULL,
  `title` TEXT,
  `content` TEXT NOT NULL,
  `media_urls` JSON DEFAULT ('{}'),
  `media_type` TEXT DEFAULT ('none'),
  `platforms` JSON NOT NULL DEFAULT ('{}'),
  `status` TEXT NOT NULL DEFAULT ('draft'),
  `scheduled_at` DATETIME(6),
  `published_at` DATETIME(6),
  `ai_generated` TINYINT(1) DEFAULT 0,
  `plagiarism_score` DECIMAL(20,6) DEFAULT 0,
  `plagiarism_checked` TINYINT(1) DEFAULT 0,
  `ai_prompt` TEXT,
  `hashtags` JSON,
  `platform_post_ids` JSON DEFAULT ('{}'),
  `engagement_metrics` JSON DEFAULT ('{}'),
  `error_message` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `team_members` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `team_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `email` TEXT NOT NULL,
  `full_name` TEXT,
  `permissions` JSON NOT NULL DEFAULT ('{view_leads}'),
  `invited_by` CHAR(36) NOT NULL,
  `accepted_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_members_team_id_user_id_key` (`team_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `teams` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `created_by` CHAR(36) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tort_types` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `description` TEXT,
  `category` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_system` TINYINT(1) DEFAULT 0,
  `created_by` CHAR(36),
  `firm_id` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tort_types_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `touchpoints` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `contact_id` CHAR(36),
  `lead_id` CHAR(36),
  `firm_id` CHAR(36),
  `user_id` CHAR(36),
  `touchpoint_type` VARCHAR(64) NOT NULL /* enum:touchpoint_type */,
  `direction` TEXT,
  `channel` TEXT,
  `subject` TEXT,
  `content` TEXT,
  `outcome` TEXT,
  `duration_seconds` INT,
  `scheduled_at` DATETIME(6),
  `completed_at` DATETIME(6),
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_presence` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `is_online` TINYINT(1) DEFAULT 0,
  `last_seen_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_presence_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `role` VARCHAR(64) NOT NULL /* enum:app_role */,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_key` (`user_id`, `role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_ai_prompts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `prompt_type` TEXT NOT NULL,
  `system_prompt` TEXT NOT NULL,
  `output_schema` JSON DEFAULT ('{}'),
  `model` TEXT DEFAULT ('google/gemini-2.5-flash'),
  `version` INT NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_ai_prompts_vertical_id_firm_id_prompt_type_key` (`vertical_id`, `firm_id`, `prompt_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_intake_fields` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `field_key` TEXT NOT NULL,
  `label` TEXT NOT NULL,
  `field_type` TEXT NOT NULL DEFAULT ('text'),
  `options` JSON DEFAULT ('[]'),
  `required` TINYINT(1) NOT NULL DEFAULT 0,
  `field_order` INT NOT NULL DEFAULT 0,
  `placeholder` TEXT,
  `validation_regex` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_intake_fields_vertical_id_firm_id_field_key_key` (`vertical_id`, `firm_id`, `field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_lead_categories` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `key` TEXT NOT NULL,
  `label` TEXT NOT NULL,
  `description` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_lead_categories_vertical_id_firm_id_key_key` (`vertical_id`, `firm_id`, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_module_access` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `module_key` TEXT NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_module_access_vertical_id_firm_id_module_key_key` (`vertical_id`, `firm_id`, `module_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_pipeline_stages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `stage_key` TEXT NOT NULL,
  `label` TEXT NOT NULL,
  `stage_order` INT NOT NULL DEFAULT 0,
  `default_fee` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `icon` TEXT,
  `color` TEXT,
  `requires_payment` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_pipeline_stages_vertical_id_firm_id_stage_key_key` (`vertical_id`, `firm_id`, `stage_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_terminology` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36),
  `terminology` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_terminology_vertical_id_firm_id_key` (`vertical_id`, `firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `video_ad_projects` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `title` TEXT NOT NULL,
  `brief` TEXT,
  `tort_type` TEXT,
  `format` TEXT DEFAULT ('9:16'),
  `duration_seconds` INT DEFAULT 30,
  `script` TEXT,
  `voiceover_text` TEXT,
  `video_url` TEXT,
  `thumbnail_url` TEXT,
  `status` TEXT DEFAULT ('draft'),
  `ai_metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `viral_content_library` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `source_platform` TEXT,
  `original_ad_summary` TEXT,
  `tort_type` TEXT,
  `engagement_score` DECIMAL(20,6),
  `inspired_variants` JSON DEFAULT ('[]'),
  `trend_tags` JSON,
  `ai_analysis` JSON,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `war_room_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `message_type` TEXT DEFAULT ('comment'),
  `content` TEXT NOT NULL,
  `tags` JSON DEFAULT ('{}'),
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_ai_activity` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36),
  `firm_id` CHAR(36) NOT NULL,
  `agent` TEXT NOT NULL,
  `action` TEXT NOT NULL,
  `input` JSON,
  `output` JSON,
  `tokens` INT,
  `cost_cents` INT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_audits` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `kind` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT ('queued'),
  `summary` JSON NOT NULL DEFAULT ('{}'),
  `lighthouse` JSON,
  `screenshots` JSON,
  `error` TEXT,
  `started_at` DATETIME(6),
  `finished_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_connectors` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `type` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT ('pending'),
  `public_id` TEXT NOT NULL,
  `token_hash` TEXT NOT NULL,
  `framework_metadata` JSON NOT NULL DEFAULT ('{}'),
  `last_seen_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `wd_connectors_public_id_key` (`public_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_findings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `audit_id` CHAR(36) NOT NULL,
  `project_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `category` TEXT NOT NULL,
  `severity` TEXT NOT NULL,
  `title` TEXT NOT NULL,
  `description` TEXT,
  `evidence` JSON NOT NULL DEFAULT ('{}'),
  `suggested_fix` JSON,
  `confidence` DECIMAL(20,6),
  `status` TEXT NOT NULL DEFAULT ('open'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_jobs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36),
  `firm_id` CHAR(36) NOT NULL,
  `type` TEXT NOT NULL,
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `status` TEXT NOT NULL DEFAULT ('queued'),
  `attempts` INT NOT NULL DEFAULT 0,
  `run_after` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `locked_until` DATETIME(6),
  `last_error` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_monitor_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `kind` TEXT NOT NULL,
  `severity` TEXT NOT NULL DEFAULT ('info'),
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_patches` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `finding_id` CHAR(36),
  `project_id` CHAR(36) NOT NULL,
  `firm_id` CHAR(36) NOT NULL,
  `file_path` TEXT,
  `diff` TEXT NOT NULL,
  `before_preview` TEXT,
  `after_preview` TEXT,
  `explanation` TEXT,
  `risk` TEXT NOT NULL DEFAULT ('med'),
  `confidence` DECIMAL(20,6),
  `status` TEXT NOT NULL DEFAULT ('proposed'),
  `applied_at` DATETIME(6),
  `applied_by` CHAR(36),
  `rollback_ref` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_projects` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL,
  `url` TEXT NOT NULL,
  `normalized_domain` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `detected_stack` JSON NOT NULL DEFAULT ('{}'),
  `health_score` INT,
  `monitoring_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `webauthn_challenges` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `challenge` TEXT NOT NULL,
  `type` TEXT NOT NULL,
  `expires_at` DATETIME(6) NOT NULL DEFAULT (now() + '00:05:00'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `webauthn_credentials` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `credential_id` TEXT NOT NULL,
  `public_key` TEXT NOT NULL,
  `counter` BIGINT NOT NULL DEFAULT 0,
  `device_name` TEXT,
  `transports` JSON,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_used_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `webauthn_credentials_credential_id_key` (`credential_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
