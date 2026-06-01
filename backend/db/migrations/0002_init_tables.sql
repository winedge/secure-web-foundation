-- Auto-generated CREATE TABLE statements (no FKs; see 0003).
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `admin_settings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `key` TEXT NOT NULL DEFAULT ,
  `value` JSON NOT NULL DEFAULT ('{}'),
  `description` TEXT DEFAULT ,
  `updated_by` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_settings_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_case_evaluations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `viability_score` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `settlement_estimate_low` DECIMAL(20,6) DEFAULT ,
  `settlement_estimate_high` DECIMAL(20,6) DEFAULT ,
  `strengths` JSON DEFAULT ('{}'),
  `weaknesses` JSON DEFAULT ('{}'),
  `recommendations` JSON DEFAULT ('{}'),
  `jurisdiction_notes` TEXT DEFAULT ,
  `statute_of_limitations` TEXT DEFAULT ,
  `similar_cases_summary` TEXT DEFAULT ,
  `evaluation_details` JSON DEFAULT ('{}'),
  `model_version` TEXT DEFAULT 'v1',
  `evaluated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_case_evaluations_lead_id_firm_id_key` (`lead_id`, `firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_decision_consents` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `lead_id` CHAR(36) DEFAULT ,
  `transparency_log_id` CHAR(36) DEFAULT ,
  `action_type` TEXT NOT NULL DEFAULT ,
  `acknowledged_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address` TEXT DEFAULT ,
  `user_agent` TEXT DEFAULT ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_feedback` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `campaign_id` CHAR(36) DEFAULT ,
  `action_type` TEXT NOT NULL DEFAULT ,
  `recommendation` JSON DEFAULT ,
  `rating` TEXT DEFAULT ,
  `feedback_text` TEXT DEFAULT ,
  `was_applied` TINYINT(1) DEFAULT 0,
  `outcome_metrics` JSON DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_lead_scores` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `conversion_probability` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `recommended_action` TEXT DEFAULT ,
  `scoring_factors` JSON DEFAULT ('{}'),
  `optimal_contact_time` TEXT DEFAULT ,
  `predicted_value` DECIMAL(20,6) DEFAULT ,
  `model_version` TEXT DEFAULT 'v1',
  `scored_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_lead_scores_lead_id_firm_id_key` (`lead_id`, `firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_performance_snapshots` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `campaign_id` CHAR(36) DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `target_states` JSON DEFAULT ,
  `snapshot_type` TEXT NOT NULL DEFAULT ,
  `metrics` JSON NOT NULL DEFAULT ,
  `ai_action_applied` TEXT DEFAULT ,
  `captured_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_seo_runs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tool` TEXT NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `user_id` CHAR(36) DEFAULT ,
  `input` JSON NOT NULL DEFAULT ('{}'),
  `output` JSON NOT NULL DEFAULT ('{}'),
  `model` TEXT DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'completed',
  `error` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_tool_results` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `tool_key` TEXT NOT NULL DEFAULT ,
  `vertical_slug` TEXT DEFAULT ,
  `input_text` TEXT DEFAULT ,
  `input_file_url` TEXT DEFAULT ,
  `input_file_name` TEXT DEFAULT ,
  `output_text` TEXT DEFAULT ,
  `output_data` JSON DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'completed',
  `error_message` TEXT DEFAULT ,
  `model_used` TEXT DEFAULT ,
  `tokens_used` INT DEFAULT ,
  `duration_ms` INT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_transparency_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `action_type` TEXT NOT NULL DEFAULT ,
  `model_name` TEXT NOT NULL DEFAULT ,
  `model_version` TEXT DEFAULT ,
  `input_summary` TEXT DEFAULT ,
  `output_summary` TEXT DEFAULT ,
  `confidence_score` DECIMAL(20,6) DEFAULT ,
  `decision_factors` JSON DEFAULT ,
  `processing_time_ms` INT DEFAULT ,
  `compliant_frameworks` JSON,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alert_notifications` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `alert_rule_id` CHAR(36) DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `title` TEXT NOT NULL DEFAULT ,
  `message` TEXT NOT NULL DEFAULT ,
  `severity` TEXT DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alert_rules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `rule_type` TEXT NOT NULL DEFAULT ,
  `conditions` JSON NOT NULL DEFAULT ('{}'),
  `is_active` TINYINT(1) DEFAULT 1,
  `notify_email` TINYINT(1) DEFAULT 1,
  `notify_in_app` TINYINT(1) DEFAULT 1,
  `last_triggered_at` DATETIME(6) DEFAULT ,
  `trigger_count` INT DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audience_profiles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `seed_data` JSON DEFAULT ('{}'),
  `demographics` JSON DEFAULT ('{}'),
  `psychographics` JSON DEFAULT ('{}'),
  `behavioral_signals` JSON DEFAULT ('{}'),
  `estimated_reach` INT DEFAULT ,
  `match_quality` DECIMAL(20,6) DEFAULT ,
  `synced_platforms` JSON DEFAULT ,
  `status` TEXT DEFAULT 'building',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) DEFAULT ,
  `action` TEXT NOT NULL DEFAULT ,
  `entity_type` TEXT NOT NULL DEFAULT ,
  `entity_id` CHAR(36) DEFAULT ,
  `details` JSON DEFAULT ,
  `ip_address` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `autopilot_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `rule_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `campaign_id` CHAR(36) DEFAULT ,
  `action_taken` TEXT NOT NULL DEFAULT ,
  `details` JSON DEFAULT ,
  `ai_reasoning` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `autopilot_rules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `campaign_id` CHAR(36) DEFAULT ,
  `rule_type` TEXT NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `conditions` JSON NOT NULL DEFAULT ,
  `actions` JSON NOT NULL DEFAULT ,
  `is_active` TINYINT(1) DEFAULT 1,
  `last_triggered_at` DATETIME(6) DEFAULT ,
  `trigger_count` INT DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `budget_reallocation_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL DEFAULT ,
  `from_ad_set_id` CHAR(36) DEFAULT ,
  `to_ad_set_id` CHAR(36) DEFAULT ,
  `from_budget` DECIMAL(20,6) DEFAULT ,
  `to_budget` DECIMAL(20,6) DEFAULT ,
  `amount_moved` DECIMAL(20,6) DEFAULT ,
  `reason` TEXT DEFAULT ,
  `ai_confidence` DECIMAL(20,6) DEFAULT ,
  `applied` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `tort_type` TEXT NOT NULL DEFAULT ,
  `target_states` JSON DEFAULT ('{}'),
  `target_age_min` INT DEFAULT ,
  `target_age_max` INT DEFAULT ,
  `daily_budget` DECIMAL(20,6) DEFAULT ,
  `total_budget` DECIMAL(20,6) DEFAULT ,
  `status` TEXT DEFAULT 'draft',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ad_headline` TEXT DEFAULT ,
  `ad_body` TEXT DEFAULT ,
  `ad_cta` TEXT DEFAULT ,
  `emotional_angle` TEXT DEFAULT ,
  `target_hook` TEXT DEFAULT ,
  `best_platform` TEXT DEFAULT ,
  `ab_test_hypothesis` TEXT DEFAULT ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `case_simulations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `lead_id` CHAR(36) DEFAULT ,
  `judge_id` CHAR(36) DEFAULT ,
  `tort_type` TEXT NOT NULL DEFAULT ,
  `jurisdiction` TEXT NOT NULL DEFAULT ,
  `simulation_results` JSON NOT NULL DEFAULT ('{}'),
  `win_probability` DECIMAL(20,6) DEFAULT ,
  `settlement_range_low` DECIMAL(20,6) DEFAULT ,
  `settlement_range_high` DECIMAL(20,6) DEFAULT ,
  `recommended_strategy` TEXT DEFAULT ,
  `simulated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `category_select_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_slug` TEXT NOT NULL DEFAULT ,
  `vertical_name` TEXT DEFAULT ,
  `state` TEXT NOT NULL DEFAULT ,
  `is_missing` TINYINT(1) NOT NULL DEFAULT 0,
  `category_count` INT NOT NULL DEFAULT 0,
  `allow_free_text_fallback` TINYINT(1) NOT NULL DEFAULT 1,
  `firm_id` CHAR(36) DEFAULT ,
  `user_id` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_conversations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) DEFAULT ,
  `type` TEXT NOT NULL DEFAULT 'team',
  `name` TEXT DEFAULT ,
  `created_by` CHAR(36) NOT NULL DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `conversation_id` CHAR(36) NOT NULL DEFAULT ,
  `sender_id` CHAR(36) NOT NULL DEFAULT ,
  `content` TEXT NOT NULL DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_participants` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `conversation_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `last_read_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `joined_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `chat_participants_conversation_id_user_id_key` (`conversation_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `competitor_ad_creatives` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `run_id` CHAR(36) NOT NULL DEFAULT ,
  `creative_id` TEXT DEFAULT ,
  `format` TEXT DEFAULT ,
  `headline` TEXT DEFAULT ,
  `body` TEXT DEFAULT ,
  `media_url` TEXT DEFAULT ,
  `destination_url` TEXT DEFAULT ,
  `first_seen` DATE DEFAULT ,
  `last_seen` DATE DEFAULT ,
  `regions` JSON DEFAULT ,
  `transparency_url` TEXT DEFAULT ,
  `raw` JSON DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `competitor_ad_runs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) DEFAULT ,
  `brand` TEXT DEFAULT ,
  `domain` TEXT DEFAULT ,
  `region` TEXT NOT NULL DEFAULT 'IN',
  `date_range` TEXT DEFAULT '30d',
  `formats` JSON,
  `advertiser_id` TEXT DEFAULT ,
  `advertiser_url` TEXT DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `ai_summary` JSON DEFAULT ,
  `error_message` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `consent_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) DEFAULT ,
  `consent_type` TEXT NOT NULL DEFAULT ,
  `consented` TINYINT(1) NOT NULL DEFAULT ,
  `ip_address` TEXT DEFAULT ,
  `user_agent` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contacts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) DEFAULT ,
  `lead_id` CHAR(36) DEFAULT ,
  `first_name` TEXT DEFAULT ,
  `last_name` TEXT DEFAULT ,
  `email` TEXT DEFAULT ,
  `phone` TEXT DEFAULT ,
  `address` TEXT DEFAULT ,
  `city` TEXT DEFAULT ,
  `state` TEXT DEFAULT ,
  `zip_code` TEXT DEFAULT ,
  `status` VARCHAR(64) DEFAULT 'new' /* enum:contact_status */,
  `source_id` CHAR(36) DEFAULT ,
  `external_id` TEXT DEFAULT ,
  `duplicate_of` CHAR(36) DEFAULT ,
  `is_duplicate` TINYINT(1) DEFAULT 0,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `creative_studio_projects` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `brief` TEXT DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `target_audience` TEXT DEFAULT ,
  `brand_tone` TEXT DEFAULT ,
  `generated_variants` JSON DEFAULT ('[]'),
  `best_performer_id` TEXT DEFAULT ,
  `status` TEXT DEFAULT 'draft',
  `ai_score` DECIMAL(20,6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_integrations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `crm_type` TEXT NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `config` JSON DEFAULT ('{}'),
  `is_active` TINYINT(1) DEFAULT 0,
  `last_sync_at` DATETIME(6) DEFAULT ,
  `sync_frequency` TEXT DEFAULT 'realtime',
  `field_mapping` JSON DEFAULT ('{}'),
  `total_synced` INT DEFAULT 0,
  `total_failed` INT DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_sync_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `integration_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `lead_id` CHAR(36) DEFAULT ,
  `sync_type` TEXT NOT NULL DEFAULT 'push',
  `status` TEXT NOT NULL DEFAULT 'pending',
  `crm_record_id` TEXT DEFAULT ,
  `error_message` TEXT DEFAULT ,
  `request_payload` JSON DEFAULT ,
  `response_payload` JSON DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cross_platform_campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `total_budget` DECIMAL(20,6) DEFAULT ,
  `platform_allocation` JSON DEFAULT '{"meta": 0.4, "google": 0.3, "tiktok": 0.2, "linkedin": 0.1}',
  `ai_optimized_allocation` JSON DEFAULT ,
  `platforms_active` JSON DEFAULT '{meta}',
  `status` TEXT DEFAULT 'draft',
  `performance_summary` JSON DEFAULT ('{}'),
  `last_optimization_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dark_funnel_visitors` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `visitor_hash` TEXT NOT NULL DEFAULT ,
  `touchpoints` JSON DEFAULT ('[]'),
  `estimated_intent` DECIMAL(20,6) DEFAULT 0,
  `tort_interest` TEXT DEFAULT ,
  `device_type` TEXT DEFAULT ,
  `geographic_region` TEXT DEFAULT ,
  `first_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `converted` TINYINT(1) DEFAULT 0,
  `lead_id` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_analyses` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `file_name` TEXT NOT NULL DEFAULT ,
  `file_url` TEXT NOT NULL DEFAULT ,
  `document_type` TEXT DEFAULT 'other',
  `extracted_facts` JSON DEFAULT ('[]'),
  `statute_risks` JSON DEFAULT ('[]'),
  `auto_populated_fields` JSON DEFAULT ('{}'),
  `ai_summary` TEXT DEFAULT ,
  `status` TEXT DEFAULT 'pending',
  `analyzed_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_signatures` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `signer_name` TEXT NOT NULL DEFAULT ,
  `signer_email` TEXT DEFAULT ,
  `signer_role` TEXT DEFAULT 'client',
  `signature_data` TEXT NOT NULL DEFAULT ,
  `document_name` TEXT NOT NULL DEFAULT ,
  `document_content` TEXT DEFAULT ,
  `ip_address` TEXT DEFAULT ,
  `user_agent` TEXT DEFAULT ,
  `signed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` CHAR(36) NOT NULL DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'signed',
  `sha256_hash` TEXT DEFAULT ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dynamic_landing_pages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `campaign_id` CHAR(36) DEFAULT ,
  `slug` TEXT NOT NULL DEFAULT ,
  `page_title` TEXT NOT NULL DEFAULT ,
  `headline` TEXT DEFAULT ,
  `subheadline` TEXT DEFAULT ,
  `cta_text` TEXT DEFAULT 'Get Free Consultation',
  `cta_color` TEXT DEFAULT ,
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
  `evidence_id` CHAR(36) NOT NULL DEFAULT ,
  `action` TEXT NOT NULL DEFAULT ,
  `actor_id` CHAR(36) NOT NULL DEFAULT ,
  `ip_address` TEXT DEFAULT ,
  `details` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `evidence_vault` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `lead_id` CHAR(36) DEFAULT ,
  `file_name` TEXT NOT NULL DEFAULT ,
  `file_url` TEXT NOT NULL DEFAULT ,
  `file_size` BIGINT DEFAULT ,
  `mime_type` TEXT DEFAULT ,
  `sha256_hash` TEXT NOT NULL DEFAULT ,
  `previous_hash` TEXT DEFAULT ,
  `chain_position` INT NOT NULL DEFAULT 1,
  `uploaded_by` CHAR(36) NOT NULL DEFAULT ,
  `metadata` JSON DEFAULT ('{}'),
  `integrity_verified` TINYINT(1) DEFAULT 1,
  `verified_at` DATETIME(6) DEFAULT ,
  `tamper_detected` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `filter_rejection_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `vertical_slug` TEXT DEFAULT ,
  `field` TEXT NOT NULL DEFAULT ,
  `rejected_value` TEXT DEFAULT ,
  `reason` TEXT NOT NULL DEFAULT ,
  `context` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_benchmarks` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `period` TEXT NOT NULL DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `avg_cpl` DECIMAL(20,6) DEFAULT ,
  `avg_conversion_rate` DECIMAL(20,6) DEFAULT ,
  `avg_case_value` DECIMAL(20,6) DEFAULT ,
  `total_leads_purchased` INT DEFAULT ,
  `total_spend` DECIMAL(20,6) DEFAULT ,
  `avg_response_time_minutes` INT DEFAULT ,
  `pipeline_velocity_days` DECIMAL(20,6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_branding` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `slug` TEXT NOT NULL DEFAULT ,
  `logo_url` TEXT DEFAULT ,
  `firm_display_name` TEXT DEFAULT ,
  `primary_color` TEXT DEFAULT '#0f172a',
  `background_color` TEXT DEFAULT '#ffffff',
  `accent_color` TEXT DEFAULT '#10b981',
  `heading_text` TEXT DEFAULT 'Submit Your Claim',
  `description_text` TEXT DEFAULT 'Fill out the form below to get started with your case evaluation.',
  `custom_fields` JSON DEFAULT ('[]'),
  `visible_fields` JSON DEFAULT '["first_name", "last_name", "email", "phone", "state", "tort_type", "diagnosis_details", "exposure_details"]',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `chatbot_enabled` TINYINT(1) DEFAULT 1,
  `chatbot_agent_name` TEXT DEFAULT 'AI Intake Assistant',
  `chatbot_avatar_url` TEXT DEFAULT ,
  `theme_key` TEXT DEFAULT ,
  `typography` JSON NOT NULL DEFAULT ('{}'),
  `layout_config` JSON NOT NULL DEFAULT ('{}'),
  `hero_config` JSON NOT NULL DEFAULT ('{}'),
  `trust_signals` JSON NOT NULL DEFAULT ('[]'),
  `testimonials` JSON NOT NULL DEFAULT ('[]'),
  `seo_config` JSON NOT NULL DEFAULT ('{}'),
  `sections` JSON NOT NULL DEFAULT ('[]'),
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `published_at` DATETIME(6) DEFAULT ,
  PRIMARY KEY (`id`),
  UNIQUE KEY `firm_branding_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_encryption_keys` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `encrypted_master_key` TEXT NOT NULL DEFAULT ,
  `key_salt` TEXT NOT NULL DEFAULT ,
  `algorithm` TEXT NOT NULL DEFAULT 'AES-256-GCM+ML-KEM-1024',
  `pqc_public_key` TEXT DEFAULT ,
  `key_version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `firm_encryption_keys_firm_id_user_id_key` (`firm_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firm_members` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `is_owner` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `firm_members_firm_id_user_id_key` (`firm_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `firms` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL DEFAULT ,
  `website` TEXT DEFAULT ,
  `states` JSON DEFAULT ('{}'),
  `practice_type` TEXT DEFAULT ,
  `contact_email` TEXT DEFAULT ,
  `contact_phone` TEXT DEFAULT ,
  `stripe_customer_id` TEXT DEFAULT ,
  `subscription_plan` VARCHAR(64) DEFAULT 'basic' /* enum:subscription_plan */,
  `subscription_status` TEXT DEFAULT 'inactive',
  `wallet_balance` DECIMAL(20,6) DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `vertical_id` CHAR(36) DEFAULT ,
  `vertical_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `country` TEXT NOT NULL DEFAULT 'US',
  `categories` JSON NOT NULL DEFAULT ('{}'),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fraud_checks` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `check_type` TEXT NOT NULL DEFAULT ,
  `severity` TEXT NOT NULL DEFAULT 'medium',
  `details` JSON DEFAULT ('{}'),
  `is_confirmed` TINYINT(1) DEFAULT 0,
  `reviewed_by` CHAR(36) DEFAULT ,
  `reviewed_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `geofence_campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `locations` JSON NOT NULL DEFAULT ('[]'),
  `radius_meters` INT DEFAULT 500,
  `ad_creative` JSON DEFAULT ('{}'),
  `is_active` TINYINT(1) DEFAULT 0,
  `impressions` INT DEFAULT 0,
  `clicks` INT DEFAULT 0,
  `conversions` INT DEFAULT 0,
  `daily_budget` DECIMAL(20,6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_account_links` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `google_account_id` TEXT NOT NULL DEFAULT ,
  `pubsub_topic` TEXT DEFAULT ,
  `email` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `gmb_account_links_google_account_id_key` (`google_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_locations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `place_id` TEXT DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `address` TEXT DEFAULT ,
  `city` TEXT DEFAULT ,
  `region` TEXT DEFAULT ,
  `postal_code` TEXT DEFAULT ,
  `country` TEXT DEFAULT ,
  `phone` TEXT DEFAULT ,
  `website` TEXT DEFAULT ,
  `primary_category` TEXT DEFAULT ,
  `hours` JSON DEFAULT ('{}'),
  `status` TEXT NOT NULL DEFAULT 'draft',
  `is_connected` TINYINT(1) NOT NULL DEFAULT 0,
  `last_synced_at` DATETIME(6) DEFAULT ,
  `raw_payload` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `google_account_id` TEXT DEFAULT ,
  `google_location_id` TEXT DEFAULT ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_oauth_consents` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `disclosure_version` TEXT NOT NULL DEFAULT ,
  `disclosure_sha256` TEXT NOT NULL DEFAULT ,
  `scopes` JSON NOT NULL DEFAULT ('{}'),
  `purposes` JSON NOT NULL DEFAULT ('{}'),
  `data_categories` JSON NOT NULL DEFAULT ('{}'),
  `retention_days` INT NOT NULL DEFAULT 365,
  `ip_address` TEXT DEFAULT ,
  `user_agent` TEXT DEFAULT ,
  `consented` TINYINT(1) NOT NULL DEFAULT 1,
  `revoked_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_posts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `location_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `post_type` TEXT NOT NULL DEFAULT 'update',
  `summary` TEXT NOT NULL DEFAULT ,
  `media_url` TEXT DEFAULT ,
  `cta_label` TEXT DEFAULT ,
  `cta_url` TEXT DEFAULT ,
  `scheduled_for` DATETIME(6) DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'draft',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_reply_templates` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `body` TEXT NOT NULL DEFAULT ,
  `tone` TEXT NOT NULL DEFAULT 'professional',
  `rating_filter` INT DEFAULT ,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_review_replies` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `review_id` CHAR(36) NOT NULL DEFAULT ,
  `template_id` CHAR(36) DEFAULT ,
  `body` TEXT NOT NULL DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'draft',
  `ai_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `ai_model` TEXT DEFAULT ,
  `created_by` CHAR(36) DEFAULT ,
  `approved_by` CHAR(36) DEFAULT ,
  `approved_at` DATETIME(6) DEFAULT ,
  `rejected_reason` TEXT DEFAULT ,
  `sent_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_reviews` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `location_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `reviewer_name` TEXT DEFAULT ,
  `rating` INT DEFAULT ,
  `text` TEXT DEFAULT ,
  `reply_text` TEXT DEFAULT ,
  `replied_at` DATETIME(6) DEFAULT ,
  `external_id` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reply_status` TEXT NOT NULL DEFAULT 'none',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gmb_sync_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `location_id` CHAR(36) DEFAULT ,
  `sync_type` TEXT NOT NULL DEFAULT 'full',
  `status` TEXT NOT NULL DEFAULT 'pending',
  `reviews_synced` INT NOT NULL DEFAULT 0,
  `posts_synced` INT NOT NULL DEFAULT 0,
  `insights_synced` INT NOT NULL DEFAULT 0,
  `error_message` TEXT DEFAULT ,
  `error_code` TEXT DEFAULT ,
  `duration_ms` INT DEFAULT ,
  `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `completed_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `industry_verticals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `slug` TEXT NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `icon` TEXT DEFAULT ,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `industry_verticals_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `intent_signals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tort_type` TEXT NOT NULL DEFAULT ,
  `state` TEXT DEFAULT ,
  `signal_source` TEXT NOT NULL DEFAULT ,
  `keyword` TEXT DEFAULT ,
  `volume_change_pct` DECIMAL(20,6) DEFAULT ,
  `intensity` DECIMAL(20,6) DEFAULT 0,
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `recommended_action` TEXT DEFAULT ,
  `ai_analysis` JSON DEFAULT ,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `journey_data` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `contact_id` CHAR(36) NOT NULL DEFAULT ,
  `stage` TEXT NOT NULL DEFAULT ,
  `entered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `exited_at` DATETIME(6) DEFAULT ,
  `duration_seconds` INT DEFAULT ,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `judge_profiles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `judge_name` TEXT NOT NULL DEFAULT ,
  `court` TEXT DEFAULT ,
  `jurisdiction` TEXT NOT NULL DEFAULT ,
  `state` TEXT DEFAULT ,
  `appointment_year` INT DEFAULT ,
  `ruling_history` JSON DEFAULT ('{}'),
  `sentiment_profile` JSON DEFAULT ('{}'),
  `avg_settlement_modifier` DECIMAL(20,6) DEFAULT ,
  `plaintiff_win_rate` DECIMAL(20,6) DEFAULT ,
  `avg_case_duration_days` INT DEFAULT ,
  `notable_rulings` JSON DEFAULT ('[]'),
  `tort_specialties` JSON DEFAULT ,
  `ai_strategy_notes` TEXT DEFAULT ,
  `last_analyzed_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_design_presets` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `background` JSON NOT NULL DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_domains` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `hostname` TEXT NOT NULL DEFAULT ,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_token` TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  `status` TEXT NOT NULL DEFAULT 'pending',
  `ssl_status` TEXT NOT NULL DEFAULT 'pending',
  `last_checked_at` DATETIME(6) DEFAULT ,
  `verified_at` DATETIME(6) DEFAULT ,
  `notes` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `landing_page_domains_hostname_key` (`hostname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_previews` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `version_id` CHAR(36) NOT NULL DEFAULT ,
  `token` TEXT NOT NULL DEFAULT ,
  `expires_at` DATETIME(6) NOT NULL DEFAULT (now() + '7 days'),
  `view_count` INT NOT NULL DEFAULT 0,
  `created_by` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `landing_page_previews_token_key` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_templates` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `category` TEXT DEFAULT 'general',
  `tags` JSON DEFAULT ('{}'),
  `thumbnail_url` TEXT DEFAULT ,
  `is_public` TINYINT(1) NOT NULL DEFAULT 0,
  `snapshot` JSON NOT NULL DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `vertical_slug` TEXT DEFAULT ,
  `is_starter` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `landing_page_versions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `label` TEXT DEFAULT ,
  `note` TEXT DEFAULT ,
  `created_by` CHAR(36) DEFAULT ,
  `snapshot` JSON NOT NULL DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_activity_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) DEFAULT ,
  `activity_type` TEXT NOT NULL DEFAULT ,
  `title` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_blockchain` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `block_number` INT NOT NULL DEFAULT ,
  `event_type` TEXT NOT NULL DEFAULT ,
  `event_data` JSON NOT NULL DEFAULT ('{}'),
  `actor_id` CHAR(36) DEFAULT ,
  `sha256_hash` TEXT NOT NULL DEFAULT ,
  `previous_hash` TEXT DEFAULT ,
  `nonce` TEXT NOT NULL DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `integrity_status` TEXT DEFAULT 'valid',
  `last_verified_at` DATETIME(6) DEFAULT ,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lead_blockchain_lead_id_block_number_key` (`lead_id`, `block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_purchases` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) DEFAULT ,
  `amount` DECIMAL(20,6) NOT NULL DEFAULT ,
  `payment_method` TEXT DEFAULT ,
  `stripe_payment_id` TEXT DEFAULT ,
  `purchased_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `pipeline_stage` TEXT NOT NULL DEFAULT 'new_lead',
  `stage_updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_referrals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `referring_firm_id` CHAR(36) NOT NULL DEFAULT ,
  `referred_to_firm_id` CHAR(36) DEFAULT ,
  `referral_fee` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `status` TEXT DEFAULT 'listed',
  `reason` TEXT DEFAULT ,
  `notes` TEXT DEFAULT ,
  `accepted_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_sources` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL DEFAULT ,
  `source_type` VARCHAR(64) NOT NULL DEFAULT  /* enum:lead_source_type */,
  `description` TEXT DEFAULT ,
  `is_active` TINYINT(1) DEFAULT 1,
  `configuration` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lead_statuses` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `contact_id` CHAR(36) DEFAULT ,
  `status` TEXT NOT NULL DEFAULT ,
  `previous_status` TEXT DEFAULT ,
  `changed_by` CHAR(36) DEFAULT ,
  `change_reason` TEXT DEFAULT ,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `leads` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) DEFAULT ,
  `tort_type` TEXT NOT NULL DEFAULT ,
  `state` TEXT NOT NULL DEFAULT ,
  `age_bucket` TEXT DEFAULT ,
  `ai_quality_score` INT DEFAULT ,
  `fraud_risk_score` INT DEFAULT ,
  `tier` VARCHAR(64) NOT NULL DEFAULT 'C' /* enum:lead_tier */,
  `is_verified` TINYINT(1) DEFAULT 0,
  `is_exclusive` TINYINT(1) DEFAULT 1,
  `price` DECIMAL(20,6) NOT NULL DEFAULT ,
  `status` VARCHAR(64) DEFAULT 'available' /* enum:lead_status */,
  `first_name` TEXT DEFAULT ,
  `last_name` TEXT DEFAULT ,
  `email` TEXT DEFAULT ,
  `phone` TEXT DEFAULT ,
  `address` TEXT DEFAULT ,
  `city` TEXT DEFAULT ,
  `zip_code` TEXT DEFAULT ,
  `diagnosis_details` TEXT DEFAULT ,
  `exposure_details` TEXT DEFAULT ,
  `documents_url` JSON DEFAULT ,
  `consent_tcpa` TINYINT(1) DEFAULT 0,
  `consent_hipaa` TINYINT(1) DEFAULT 0,
  `consent_privacy` TINYINT(1) DEFAULT 0,
  `source` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `source_id` CHAR(36) DEFAULT ,
  `external_id` TEXT DEFAULT ,
  `is_duplicate` TINYINT(1) DEFAULT 0,
  `duplicate_of` CHAR(36) DEFAULT ,
  `ingested_at` DATETIME(6) DEFAULT ,
  `metadata` JSON DEFAULT ('{}'),
  `session_recording_url` TEXT DEFAULT ,
  `vertical_id` CHAR(36) DEFAULT ,
  `category` TEXT DEFAULT ,
  `custom_fields` JSON NOT NULL DEFAULT ('{}'),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `market_pulse_alerts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `title` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `source_type` TEXT NOT NULL DEFAULT 'news',
  `source_url` TEXT DEFAULT ,
  `severity` TEXT NOT NULL DEFAULT 'medium',
  `affected_states` JSON DEFAULT ,
  `estimated_market_size` TEXT DEFAULT ,
  `competition_level` TEXT DEFAULT ,
  `ai_confidence` DECIMAL(20,6) DEFAULT 0,
  `ai_analysis` JSON DEFAULT ,
  `is_trending` TINYINT(1) DEFAULT 0,
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6) DEFAULT ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `market_pulse_watchlist` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
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
  `campaign_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'draft',
  `daily_budget` DECIMAL(20,6) DEFAULT 0,
  `targeting` JSON DEFAULT ('{}'),
  `age_min` INT DEFAULT 18,
  `age_max` INT DEFAULT 65,
  `genders` JSON DEFAULT '{all}',
  `locations` JSON DEFAULT ('[]'),
  `interests` JSON DEFAULT ('[]'),
  `lookalike_audience_id` TEXT DEFAULT ,
  `custom_audience_id` TEXT DEFAULT ,
  `placement_type` TEXT DEFAULT 'automatic',
  `placements` JSON DEFAULT '{facebook_feed,instagram_feed,audience_network}',
  `optimization_event` TEXT DEFAULT 'LEAD',
  `bid_amount` DECIMAL(20,6) DEFAULT ,
  `meta_adset_id` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_ads` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `ad_set_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'draft',
  `headline` TEXT DEFAULT ,
  `body_text` TEXT DEFAULT ,
  `description` TEXT DEFAULT ,
  `call_to_action` TEXT DEFAULT 'LEARN_MORE',
  `image_url` TEXT DEFAULT ,
  `video_url` TEXT DEFAULT ,
  `link_url` TEXT DEFAULT ,
  `display_link` TEXT DEFAULT ,
  `creative_type` TEXT DEFAULT 'image',
  `ai_generated` TINYINT(1) DEFAULT 0,
  `ai_score` DECIMAL(20,6) DEFAULT ,
  `meta_ad_id` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_ai_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL DEFAULT ,
  `action_type` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `recommendation` JSON DEFAULT ('{}'),
  `applied` TINYINT(1) DEFAULT 0,
  `applied_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meta_campaign_analytics` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL DEFAULT ,
  `ad_set_id` CHAR(36) DEFAULT ,
  `ad_id` CHAR(36) DEFAULT ,
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
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `objective` TEXT NOT NULL DEFAULT 'LEAD_GENERATION',
  `status` TEXT NOT NULL DEFAULT 'draft',
  `daily_budget` DECIMAL(20,6) DEFAULT 0,
  `lifetime_budget` DECIMAL(20,6) DEFAULT 0,
  `start_date` DATETIME(6) DEFAULT ,
  `end_date` DATETIME(6) DEFAULT ,
  `bid_strategy` TEXT DEFAULT 'LOWEST_COST',
  `optimization_goal` TEXT DEFAULT 'LEAD',
  `ai_recommendations` JSON DEFAULT ('{}'),
  `meta_campaign_id` TEXT DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `target_states` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notes` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) DEFAULT ,
  `contact_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `user_id` CHAR(36) DEFAULT ,
  `title` TEXT DEFAULT ,
  `content` TEXT NOT NULL DEFAULT ,
  `is_pinned` TINYINT(1) DEFAULT 0,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_preferences` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `notify_new_leads` TINYINT(1) NOT NULL DEFAULT 1,
  `notify_email` TEXT DEFAULT ,
  `tort_types` JSON DEFAULT ('{}'),
  `states` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_preferences_firm_id_key` (`firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pipeline_charges` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `from_stage` TEXT NOT NULL DEFAULT ,
  `to_stage` TEXT NOT NULL DEFAULT ,
  `amount` DECIMAL(20,6) NOT NULL DEFAULT ,
  `payment_method` TEXT NOT NULL DEFAULT 'wallet',
  `stripe_session_id` TEXT DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'completed',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `platform_connections` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `platform` TEXT NOT NULL DEFAULT ,
  `platform_user_id` TEXT DEFAULT ,
  `platform_username` TEXT DEFAULT ,
  `access_token` TEXT DEFAULT ,
  `refresh_token` TEXT DEFAULT ,
  `token_expires_at` DATETIME(6) DEFAULT ,
  `page_id` TEXT DEFAULT ,
  `page_name` TEXT DEFAULT ,
  `page_access_token` TEXT DEFAULT ,
  `permissions` JSON DEFAULT ,
  `is_active` TINYINT(1) DEFAULT 1,
  `metadata` JSON DEFAULT ('{}'),
  `connected_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `predictive_lead_signals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tort_type` TEXT NOT NULL DEFAULT ,
  `state` TEXT NOT NULL DEFAULT ,
  `signal_type` TEXT NOT NULL DEFAULT ,
  `signal_strength` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `predicted_volume` INT DEFAULT ,
  `predicted_timeframe` TEXT DEFAULT ,
  `confidence` DECIMAL(20,6) DEFAULT 0,
  `data_sources` JSON DEFAULT ('[]'),
  `ai_reasoning` TEXT DEFAULT ,
  `is_active` TINYINT(1) DEFAULT 1,
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `profiles` (
  `id` CHAR(36) NOT NULL DEFAULT ,
  `email` TEXT NOT NULL DEFAULT ,
  `full_name` TEXT DEFAULT ,
  `avatar_url` TEXT DEFAULT ,
  `phone` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `onboarding_completed` TINYINT(1) DEFAULT 0,
  `onboarding_step` INT DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `recovery_codes` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `code_hash` TEXT NOT NULL DEFAULT ,
  `used_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `source` TEXT NOT NULL DEFAULT 'totp',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `report_schedules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `created_by` CHAR(36) NOT NULL DEFAULT ,
  `report_type` TEXT NOT NULL DEFAULT 'meta_performance',
  `frequency` TEXT NOT NULL DEFAULT 'weekly',
  `emails` JSON NOT NULL DEFAULT ('{}'),
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_sent_at` DATETIME(6) DEFAULT ,
  `next_send_at` DATETIME(6) DEFAULT ,
  `config` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_module_permissions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `role` TEXT NOT NULL DEFAULT ,
  `module_key` TEXT NOT NULL DEFAULT ,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_module_permissions_role_module_key_key` (`role`, `module_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seo_issues` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `scan_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `severity` TEXT NOT NULL DEFAULT 'info',
  `category` TEXT NOT NULL DEFAULT ,
  `page_url` TEXT DEFAULT ,
  `message` TEXT NOT NULL DEFAULT ,
  `recommendation` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seo_scans` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `url` TEXT NOT NULL DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `overall_score` INT DEFAULT ,
  `pages_crawled` INT DEFAULT 0,
  `errors_count` INT DEFAULT 0,
  `warnings_count` INT DEFAULT 0,
  `summary` JSON DEFAULT ('{}'),
  `raw_report` JSON DEFAULT ('{}'),
  `error_message` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `completed_at` DATETIME(6) DEFAULT ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seo_thresholds` (
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `title_min` INT NOT NULL DEFAULT 30,
  `title_max` INT NOT NULL DEFAULT 60,
  `description_min` INT NOT NULL DEFAULT 50,
  `description_max` INT NOT NULL DEFAULT 160,
  `word_count_min` INT NOT NULL DEFAULT 300,
  `h1_max` INT NOT NULL DEFAULT 1,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` CHAR(36) DEFAULT ,
  PRIMARY KEY (`firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_posts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `title` TEXT DEFAULT ,
  `content` TEXT NOT NULL DEFAULT ,
  `media_urls` JSON DEFAULT ('{}'),
  `media_type` TEXT DEFAULT 'none',
  `platforms` JSON NOT NULL DEFAULT ('{}'),
  `status` TEXT NOT NULL DEFAULT 'draft',
  `scheduled_at` DATETIME(6) DEFAULT ,
  `published_at` DATETIME(6) DEFAULT ,
  `ai_generated` TINYINT(1) DEFAULT 0,
  `plagiarism_score` DECIMAL(20,6) DEFAULT 0,
  `plagiarism_checked` TINYINT(1) DEFAULT 0,
  `ai_prompt` TEXT DEFAULT ,
  `hashtags` JSON DEFAULT ,
  `platform_post_ids` JSON DEFAULT ('{}'),
  `engagement_metrics` JSON DEFAULT ('{}'),
  `error_message` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `team_members` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `team_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `email` TEXT NOT NULL DEFAULT ,
  `full_name` TEXT DEFAULT ,
  `permissions` JSON NOT NULL DEFAULT '{view_leads}',
  `invited_by` CHAR(36) NOT NULL DEFAULT ,
  `accepted_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_members_team_id_user_id_key` (`team_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `teams` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `created_by` CHAR(36) NOT NULL DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tort_types` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `category` TEXT DEFAULT ,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_system` TINYINT(1) DEFAULT 0,
  `created_by` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tort_types_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `touchpoints` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `contact_id` CHAR(36) DEFAULT ,
  `lead_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `user_id` CHAR(36) DEFAULT ,
  `touchpoint_type` VARCHAR(64) NOT NULL DEFAULT  /* enum:touchpoint_type */,
  `direction` TEXT DEFAULT ,
  `channel` TEXT DEFAULT ,
  `subject` TEXT DEFAULT ,
  `content` TEXT DEFAULT ,
  `outcome` TEXT DEFAULT ,
  `duration_seconds` INT DEFAULT ,
  `scheduled_at` DATETIME(6) DEFAULT ,
  `completed_at` DATETIME(6) DEFAULT ,
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_presence` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `is_online` TINYINT(1) DEFAULT 0,
  `last_seen_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_presence_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `role` VARCHAR(64) NOT NULL DEFAULT  /* enum:app_role */,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_key` (`user_id`, `role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_ai_prompts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `prompt_type` TEXT NOT NULL DEFAULT ,
  `system_prompt` TEXT NOT NULL DEFAULT ,
  `output_schema` JSON DEFAULT ('{}'),
  `model` TEXT DEFAULT 'google/gemini-2.5-flash',
  `version` INT NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_ai_prompts_vertical_id_firm_id_prompt_type_key` (`vertical_id`, `firm_id`, `prompt_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_intake_fields` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `field_key` TEXT NOT NULL DEFAULT ,
  `label` TEXT NOT NULL DEFAULT ,
  `field_type` TEXT NOT NULL DEFAULT 'text',
  `options` JSON DEFAULT ('[]'),
  `required` TINYINT(1) NOT NULL DEFAULT 0,
  `field_order` INT NOT NULL DEFAULT 0,
  `placeholder` TEXT DEFAULT ,
  `validation_regex` TEXT DEFAULT ,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_intake_fields_vertical_id_firm_id_field_key_key` (`vertical_id`, `firm_id`, `field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_lead_categories` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `key` TEXT NOT NULL DEFAULT ,
  `label` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_lead_categories_vertical_id_firm_id_key_key` (`vertical_id`, `firm_id`, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_module_access` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `module_key` TEXT NOT NULL DEFAULT ,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_module_access_vertical_id_firm_id_module_key_key` (`vertical_id`, `firm_id`, `module_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_pipeline_stages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `stage_key` TEXT NOT NULL DEFAULT ,
  `label` TEXT NOT NULL DEFAULT ,
  `stage_order` INT NOT NULL DEFAULT 0,
  `default_fee` DECIMAL(20,6) NOT NULL DEFAULT 0,
  `icon` TEXT DEFAULT ,
  `color` TEXT DEFAULT ,
  `requires_payment` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_pipeline_stages_vertical_id_firm_id_stage_key_key` (`vertical_id`, `firm_id`, `stage_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vertical_terminology` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `vertical_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) DEFAULT ,
  `terminology` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_terminology_vertical_id_firm_id_key` (`vertical_id`, `firm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `video_ad_projects` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `title` TEXT NOT NULL DEFAULT ,
  `brief` TEXT DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `format` TEXT DEFAULT '9:16',
  `duration_seconds` INT DEFAULT 30,
  `script` TEXT DEFAULT ,
  `voiceover_text` TEXT DEFAULT ,
  `video_url` TEXT DEFAULT ,
  `thumbnail_url` TEXT DEFAULT ,
  `status` TEXT DEFAULT 'draft',
  `ai_metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `viral_content_library` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `source_platform` TEXT DEFAULT ,
  `original_ad_summary` TEXT DEFAULT ,
  `tort_type` TEXT DEFAULT ,
  `engagement_score` DECIMAL(20,6) DEFAULT ,
  `inspired_variants` JSON DEFAULT ('[]'),
  `trend_tags` JSON DEFAULT ,
  `ai_analysis` JSON DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `war_room_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `lead_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `message_type` TEXT DEFAULT 'comment',
  `content` TEXT NOT NULL DEFAULT ,
  `tags` JSON DEFAULT ('{}'),
  `metadata` JSON DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_ai_activity` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `agent` TEXT NOT NULL DEFAULT ,
  `action` TEXT NOT NULL DEFAULT ,
  `input` JSON DEFAULT ,
  `output` JSON DEFAULT ,
  `tokens` INT DEFAULT ,
  `cost_cents` INT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_audits` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `kind` TEXT NOT NULL DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'queued',
  `summary` JSON NOT NULL DEFAULT ('{}'),
  `lighthouse` JSON DEFAULT ,
  `screenshots` JSON DEFAULT ,
  `error` TEXT DEFAULT ,
  `started_at` DATETIME(6) DEFAULT ,
  `finished_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_connectors` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `type` TEXT NOT NULL DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `public_id` TEXT NOT NULL DEFAULT ,
  `token_hash` TEXT NOT NULL DEFAULT ,
  `framework_metadata` JSON NOT NULL DEFAULT ('{}'),
  `last_seen_at` DATETIME(6) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `wd_connectors_public_id_key` (`public_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_findings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `audit_id` CHAR(36) NOT NULL DEFAULT ,
  `project_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `category` TEXT NOT NULL DEFAULT ,
  `severity` TEXT NOT NULL DEFAULT ,
  `title` TEXT NOT NULL DEFAULT ,
  `description` TEXT DEFAULT ,
  `evidence` JSON NOT NULL DEFAULT ('{}'),
  `suggested_fix` JSON DEFAULT ,
  `confidence` DECIMAL(20,6) DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'open',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_jobs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `type` TEXT NOT NULL DEFAULT ,
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `status` TEXT NOT NULL DEFAULT 'queued',
  `attempts` INT NOT NULL DEFAULT 0,
  `run_after` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `locked_until` DATETIME(6) DEFAULT ,
  `last_error` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_monitor_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `project_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `kind` TEXT NOT NULL DEFAULT ,
  `severity` TEXT NOT NULL DEFAULT 'info',
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_patches` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `finding_id` CHAR(36) DEFAULT ,
  `project_id` CHAR(36) NOT NULL DEFAULT ,
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `file_path` TEXT DEFAULT ,
  `diff` TEXT NOT NULL DEFAULT ,
  `before_preview` TEXT DEFAULT ,
  `after_preview` TEXT DEFAULT ,
  `explanation` TEXT DEFAULT ,
  `risk` TEXT NOT NULL DEFAULT 'med',
  `confidence` DECIMAL(20,6) DEFAULT ,
  `status` TEXT NOT NULL DEFAULT 'proposed',
  `applied_at` DATETIME(6) DEFAULT ,
  `applied_by` CHAR(36) DEFAULT ,
  `rollback_ref` TEXT DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wd_projects` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `firm_id` CHAR(36) NOT NULL DEFAULT ,
  `url` TEXT NOT NULL DEFAULT ,
  `normalized_domain` TEXT NOT NULL DEFAULT ,
  `name` TEXT NOT NULL DEFAULT ,
  `detected_stack` JSON NOT NULL DEFAULT ('{}'),
  `health_score` INT DEFAULT ,
  `monitoring_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` CHAR(36) DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `webauthn_challenges` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `challenge` TEXT NOT NULL DEFAULT ,
  `type` TEXT NOT NULL DEFAULT ,
  `expires_at` DATETIME(6) NOT NULL DEFAULT (now() + '00:05:00'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `webauthn_credentials` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL DEFAULT ,
  `credential_id` TEXT NOT NULL DEFAULT ,
  `public_key` TEXT NOT NULL DEFAULT ,
  `counter` BIGINT NOT NULL DEFAULT 0,
  `device_name` TEXT DEFAULT ,
  `transports` JSON DEFAULT ,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_used_at` DATETIME(6) DEFAULT ,
  PRIMARY KEY (`id`),
  UNIQUE KEY `webauthn_credentials_credential_id_key` (`credential_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
