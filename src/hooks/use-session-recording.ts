import { useRef, useCallback, useEffect } from 'react';
import { record } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import { supabase } from '@/integrations/supabase/client';

interface UseSessionRecordingReturn {
  startRecording: () => void;
  stopRecording: () => eventWithTime[];
  uploadRecording: (leadId: string) => Promise<string | null>;
  isRecording: boolean;
}

export function useSessionRecording(): UseSessionRecordingReturn {
  const eventsRef = useRef<eventWithTime[]>([]);
  const stopFnRef = useRef<(() => void) | null>(null);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback(() => {
    if (isRecordingRef.current) return;
    eventsRef.current = [];
    isRecordingRef.current = true;

    const stop = record({
      emit(event) {
        eventsRef.current.push(event);
      },
      // Mask sensitive inputs for privacy
      maskInputOptions: {
        password: true,
      },
      // Sample mouse movements to reduce size
      sampling: {
        mousemove: true,
        mouseInteraction: true,
        scroll: 150,
        input: 'last',
      },
      // Inline styles for accurate replay
      inlineStylesheet: true,
      // Record canvas content
      recordCanvas: false,
    });

    stopFnRef.current = stop || null;
  }, []);

  const stopRecording = useCallback(() => {
    if (stopFnRef.current) {
      stopFnRef.current();
      stopFnRef.current = null;
    }
    isRecordingRef.current = false;
    return eventsRef.current;
  }, []);

  const uploadRecording = useCallback(async (leadId: string): Promise<string | null> => {
    const events = stopRecording();
    if (events.length === 0) return null;

    try {
      const jsonStr = JSON.stringify(events);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const filePath = `${leadId}/${Date.now()}.json`;

      const { error: uploadError } = await supabase.storage
        .from('session-recordings')
        .upload(filePath, blob, {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadError) {
        console.error('Recording upload error:', uploadError);
        return null;
      }

      // Update the lead with the recording path
      await supabase
        .from('leads')
        .update({ session_recording_url: filePath } as any)
        .eq('id', leadId);

      return filePath;
    } catch (err) {
      console.error('Failed to upload session recording:', err);
      return null;
    }
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopFnRef.current) {
        stopFnRef.current();
      }
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    uploadRecording,
    isRecording: isRecordingRef.current,
  };
}
