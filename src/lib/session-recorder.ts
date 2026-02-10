/**
 * Comprehensive session recorder for intake form tracking.
 * Captures browser fingerprint, form interactions, timing, and consent validation.
 */

export interface BrowserFingerprint {
  user_agent: string;
  platform: string;
  language: string;
  languages: string[];
  timezone: string;
  timezone_offset: number;
  screen_width: number;
  screen_height: number;
  screen_color_depth: number;
  viewport_width: number;
  viewport_height: number;
  device_pixel_ratio: number;
  touch_support: boolean;
  cookie_enabled: boolean;
  do_not_track: string | null;
  hardware_concurrency: number;
  device_memory: number | null;
  connection_type: string | null;
}

export interface FormInteraction {
  timestamp: string;
  event_type: 'focus' | 'blur' | 'change' | 'click' | 'check' | 'select';
  field_name: string;
  field_type: string;
  value_length?: number;
  duration_ms?: number;
}

export interface TimingData {
  page_load_time: number;
  dom_content_loaded: number;
  session_start: string;
  form_start_time: string | null;
  form_end_time: string | null;
  form_completion_seconds: number;
  total_session_seconds: number;
  idle_time_seconds: number;
  active_time_seconds: number;
}

export interface ConsentValidation {
  tcpa_text_hash: string;
  privacy_text_hash: string;
  hipaa_text_hash: string | null;
  consent_captured_at: string;
  consent_language_version: string;
}

export interface ClientNetworkInfo {
  ip_address: string;
  geolocation: {
    country?: string;
    country_code?: string;
    region?: string;
    region_code?: string;
    city?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    isp?: string;
    org?: string;
  };
}

export interface SessionRecord {
  fingerprint: BrowserFingerprint;
  interactions: FormInteraction[];
  timing: TimingData;
  consent_validation: ConsentValidation | null;
  client_info: ClientNetworkInfo | null;
  pages_visited: string[];
  referrer: string;
  entry_url: string;
  posthog_session_id: string | null;
  posthog_distinct_id: string | null;
}

// Simple hash function for consent text verification
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function collectBrowserFingerprint(): BrowserFingerprint {
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  return {
    user_agent: navigator.userAgent,
    platform: navigator.platform || 'unknown',
    language: navigator.language,
    languages: [...(navigator.languages || [])],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezone_offset: new Date().getTimezoneOffset(),
    screen_width: screen.width,
    screen_height: screen.height,
    screen_color_depth: screen.colorDepth,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio,
    touch_support: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    cookie_enabled: navigator.cookieEnabled,
    do_not_track: navigator.doNotTrack,
    hardware_concurrency: navigator.hardwareConcurrency || 0,
    device_memory: nav.deviceMemory || null,
    connection_type: conn?.effectiveType || null,
  };
}

export class SessionRecorder {
  private interactions: FormInteraction[] = [];
  private sessionStart: Date;
  private formStartTime: Date | null = null;
  private lastActivityTime: Date;
  private idleTime = 0;
  private pagesVisited: string[] = [];
  private fieldFocusTimes: Map<string, number> = new Map();

  constructor() {
    this.sessionStart = new Date();
    this.lastActivityTime = new Date();
    this.pagesVisited = [window.location.pathname];
  }

  trackActivity() {
    const now = new Date();
    const gap = now.getTime() - this.lastActivityTime.getTime();
    // If gap > 30 seconds, count as idle
    if (gap > 30000) {
      this.idleTime += gap / 1000;
    }
    this.lastActivityTime = now;
  }

  trackFormStart() {
    if (!this.formStartTime) {
      this.formStartTime = new Date();
    }
  }

  trackFieldFocus(fieldName: string, fieldType: string) {
    this.trackActivity();
    this.trackFormStart();
    this.fieldFocusTimes.set(fieldName, Date.now());
    this.interactions.push({
      timestamp: new Date().toISOString(),
      event_type: 'focus',
      field_name: fieldName,
      field_type: fieldType,
    });
  }

  trackFieldBlur(fieldName: string, fieldType: string, valueLength?: number) {
    this.trackActivity();
    const focusStart = this.fieldFocusTimes.get(fieldName);
    const duration = focusStart ? Date.now() - focusStart : undefined;
    this.interactions.push({
      timestamp: new Date().toISOString(),
      event_type: 'blur',
      field_name: fieldName,
      field_type: fieldType,
      value_length: valueLength,
      duration_ms: duration,
    });
  }

  trackFieldChange(fieldName: string, fieldType: string, valueLength?: number) {
    this.trackActivity();
    this.interactions.push({
      timestamp: new Date().toISOString(),
      event_type: 'change',
      field_name: fieldName,
      field_type: fieldType,
      value_length: valueLength,
    });
  }

  trackCheckboxClick(fieldName: string, checked: boolean) {
    this.trackActivity();
    this.interactions.push({
      timestamp: new Date().toISOString(),
      event_type: 'check',
      field_name: fieldName,
      field_type: 'checkbox',
      value_length: checked ? 1 : 0,
    });
  }

  trackSelectChange(fieldName: string, value: string) {
    this.trackActivity();
    this.interactions.push({
      timestamp: new Date().toISOString(),
      event_type: 'select',
      field_name: fieldName,
      field_type: 'select',
      value_length: value.length,
    });
  }

  addPageVisit(path: string) {
    if (!this.pagesVisited.includes(path)) {
      this.pagesVisited.push(path);
    }
  }

  async buildConsentValidation(
    tcpaText: string,
    privacyText: string,
    hipaaText?: string
  ): Promise<ConsentValidation> {
    const [tcpaHash, privacyHash, hipaaHash] = await Promise.all([
      hashText(tcpaText),
      hashText(privacyText),
      hipaaText ? hashText(hipaaText) : Promise.resolve(null),
    ]);

    return {
      tcpa_text_hash: tcpaHash,
      privacy_text_hash: privacyHash,
      hipaa_text_hash: hipaaHash,
      consent_captured_at: new Date().toISOString(),
      consent_language_version: '1.0',
    };
  }

  getTimingData(): TimingData {
    const now = new Date();
    const totalSeconds = (now.getTime() - this.sessionStart.getTime()) / 1000;
    const formSeconds = this.formStartTime
      ? (now.getTime() - this.formStartTime.getTime()) / 1000
      : 0;

    // Page load timing
    const perfEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const navTiming = perfEntries[0];

    return {
      page_load_time: navTiming ? Math.round(navTiming.loadEventEnd - navTiming.startTime) : 0,
      dom_content_loaded: navTiming ? Math.round(navTiming.domContentLoadedEventEnd - navTiming.startTime) : 0,
      session_start: this.sessionStart.toISOString(),
      form_start_time: this.formStartTime?.toISOString() || null,
      form_end_time: now.toISOString(),
      form_completion_seconds: Math.round(formSeconds),
      total_session_seconds: Math.round(totalSeconds),
      idle_time_seconds: Math.round(this.idleTime),
      active_time_seconds: Math.round(totalSeconds - this.idleTime),
    };
  }

  buildRecord(
    posthogSessionId: string | null,
    posthogDistinctId: string | null,
    consentValidation: ConsentValidation | null,
    clientInfo: ClientNetworkInfo | null = null
  ): SessionRecord {
    return {
      fingerprint: collectBrowserFingerprint(),
      interactions: this.interactions,
      timing: this.getTimingData(),
      consent_validation: consentValidation,
      client_info: clientInfo,
      pages_visited: this.pagesVisited,
      referrer: document.referrer,
      entry_url: window.location.href,
      posthog_session_id: posthogSessionId,
      posthog_distinct_id: posthogDistinctId,
    };
  }
}
