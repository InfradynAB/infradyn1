/**
 * Configuration Defaults - Shared config values
 *
 * These are pure config definitions that don't need "use server" directive.
 * Separated from config-engine.ts to avoid Server Actions errors.
 */

// Config value interface
export interface ConfigValueType {
    value: string;
    type: "NUMBER" | "BOOLEAN" | "STRING" | "JSON";
    description: string;
}

// Default configuration values (can be exported for tests)
export const DEFAULT_CONFIGS: Record<string, ConfigValueType> = {
    // Delay thresholds
    "delay_tolerance_days": {
        value: "2",
        type: "NUMBER",
        description: "Days before a delay flag is created"
    },
    "high_delay_threshold_days": {
        value: "5",
        type: "NUMBER",
        description: "Days for immediate PM notification"
    },

    // Quantity variance thresholds
    "quantity_variance_threshold": {
        value: "5",
        type: "NUMBER",
        description: "Percentage variance before conflict queue entry"
    },
    "high_variance_threshold": {
        value: "10",
        type: "NUMBER",
        description: "Percentage for immediate PM alert"
    },

    // Invoice thresholds
    "high_value_invoice_threshold": {
        value: "10000",
        type: "NUMBER",
        description: "USD amount for duplicate invoice detection"
    },

    // Logistics API settings (Maersk & DHL only)
    "logistics_poll_frequency_hours": {
        value: "2",
        type: "NUMBER",
        description: "Hours between logistics API polls"
    },
    "maersk_api_enabled": {
        value: "true",
        type: "BOOLEAN",
        description: "Enable Maersk tracking integration"
    },
    "dhl_api_enabled": {
        value: "true",
        type: "BOOLEAN",
        description: "Enable DHL tracking integration"
    },

    // Auto-accept settings
    "enable_auto_accept_policy": {
        value: "false",
        type: "BOOLEAN",
        description: "Auto-accept from high-accuracy suppliers"
    },
    "auto_accept_accuracy_threshold": {
        value: "90",
        type: "NUMBER",
        description: "Minimum accuracy score for auto-accept"
    },

    // Digest settings
    "conflict_digest_frequency": {
        value: "DAILY",
        type: "STRING",
        description: "Frequency of conflict digest emails (HOURLY, DAILY, WEEKLY)"
    },
    "digest_min_severity": {
        value: "LOW",
        type: "STRING",
        description: "Minimum severity to include in digest (LOW, MEDIUM, HIGH)"
    },

    // Notification settings
    "notify_pm_on_high_delay": {
        value: "true",
        type: "BOOLEAN",
        description: "Immediately notify PM on high-severity delays"
    },
    "notify_pm_on_high_variance": {
        value: "true",
        type: "BOOLEAN",
        description: "Immediately notify PM on high-variance deliveries"
    },
    "notify_pm_on_duplicate_invoice": {
        value: "true",
        type: "BOOLEAN",
        description: "Immediately notify PM on duplicate invoice detection"
    },

    // Escalation settings
    "escalation_l1_wait_hours": {
        value: "24",
        type: "NUMBER",
        description: "Hours before escalating from L0 to L1"
    },
    "escalation_l2_wait_hours": {
        value: "48",
        type: "NUMBER",
        description: "Hours before escalating from L1 to L2"
    },
    "max_escalation_level": {
        value: "3",
        type: "NUMBER",
        description: "Maximum escalation level (1-5)"
    },

    // ETA confidence decay
    "eta_confidence_decay_hours": {
        value: "48",
        type: "NUMBER",
        description: "Hours after which ETA confidence starts decaying"
    },
    "eta_high_confidence_threshold": {
        value: "80",
        type: "NUMBER",
        description: "Minimum confidence percentage for high-confidence ETAs"
    },

    // Progress monitoring
    "progress_update_reminder_hours": {
        value: "72",
        type: "NUMBER",
        description: "Hours between progress update reminders"
    },
    "missed_update_threshold": {
        value: "3",
        type: "NUMBER",
        description: "Number of missed updates before flagging supplier"
    },
};
