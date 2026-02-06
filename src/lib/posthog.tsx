import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// PostHog configuration - using publishable key (safe for frontend)
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

// Initialize PostHog
export const initPostHog = () => {
  if (POSTHOG_KEY && typeof window !== 'undefined') {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Enable session recording
      session_recording: {
        maskAllInputs: false, // Set to true if you want to mask sensitive inputs
        maskTextSelector: '[data-mask]', // Mask elements with data-mask attribute
      },
      // Capture pageviews automatically
      capture_pageview: true,
      capture_pageleave: true,
      // Enable autocapture for clicks, form submissions, etc.
      autocapture: true,
      // Persistence
      persistence: 'localStorage',
      // Enable feature flags
      bootstrap: {
        featureFlags: {},
      },
    });
  }
};

// Get current session replay URL
export const getSessionReplayUrl = (): string | null => {
  if (!POSTHOG_KEY) return null;
  
  try {
    const sessionId = posthog.get_session_id();
    if (sessionId) {
      // Format: https://us.posthog.com/project/{project_id}/replay/{session_id}
      // Since we don't have project ID on frontend, we'll store session ID
      return sessionId;
    }
  } catch (e) {
    console.error('Error getting session replay URL:', e);
  }
  return null;
};

// Get session recording ID
export const getSessionId = (): string | null => {
  if (!POSTHOG_KEY) return null;
  try {
    return posthog.get_session_id() || null;
  } catch {
    return null;
  }
};

// Get distinct ID (user identifier)
export const getDistinctId = (): string | null => {
  if (!POSTHOG_KEY) return null;
  try {
    return posthog.get_distinct_id() || null;
  } catch {
    return null;
  }
};

// Identify a user (after form submission or login)
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
};

// Track a custom event
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (!POSTHOG_KEY) return;
  posthog.capture(eventName, properties);
};

// Track lead submission with session data
export const trackLeadSubmission = (leadId: string, formData: Record<string, any>) => {
  if (!POSTHOG_KEY) return null;
  
  const sessionId = getSessionId();
  const distinctId = getDistinctId();
  
  // Capture the event
  posthog.capture('lead_submitted', {
    lead_id: leadId,
    session_id: sessionId,
    ...formData,
  });
  
  // Return session data to store with lead
  return {
    posthog_session_id: sessionId,
    posthog_distinct_id: distinctId,
    session_start: new Date().toISOString(),
  };
};

// Page view tracker component
export function PostHogPageView() {
  const location = useLocation();
  
  useEffect(() => {
    if (POSTHOG_KEY) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        path: location.pathname,
      });
    }
  }, [location]);
  
  return null;
}

// PostHog Provider wrapper
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);
  
  if (!POSTHOG_KEY) {
    // If no key configured, just render children without PostHog
    return <>{children}</>;
  }
  
  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  );
}

// Export the posthog instance for direct use
export { posthog };
