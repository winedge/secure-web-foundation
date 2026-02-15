import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface SessionReplayViewerProps {
  recordingPath: string;
  leadName?: string;
}

export function SessionReplayViewer({ recordingPath, leadName }: SessionReplayViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const timerRef = useRef<number>();

  const loadRecording = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: downloadError } = await supabase.storage
        .from('session-recordings')
        .download(recordingPath);

      if (downloadError) throw new Error(downloadError.message);

      const text = await data.text();
      const events = JSON.parse(text);

      if (!events || events.length < 2) {
        setError('Recording is too short to replay.');
        return;
      }

      // Dynamically import rrweb's Replayer to avoid SSR issues
      const { Replayer } = await import('rrweb');

      // Clear previous replayer
      if (replayerRef.current) {
        replayerRef.current.destroy();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const replayer = new Replayer(events, {
        root: containerRef.current!,
        skipInactive: true,
        showWarning: false,
        showDebug: false,
        speed,
        UNSAFE_replayCanvas: false,
      });

      replayerRef.current = replayer;

      const meta = replayer.getMetaData();
      setDuration(meta.totalTime);

      // Listen for finish
      replayer.on('finish', () => {
        setPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
      });

    } catch (err: any) {
      console.error('Failed to load recording:', err);
      setError(err.message || 'Failed to load recording');
    } finally {
      setLoading(false);
    }
  }, [recordingPath, speed]);

  useEffect(() => {
    loadRecording();
    return () => {
      if (replayerRef.current) {
        replayerRef.current.destroy();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadRecording]);

  const handlePlay = () => {
    if (!replayerRef.current) return;
    if (playing) {
      replayerRef.current.pause();
      setPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      replayerRef.current.play(progress);
      setPlaying(true);
      timerRef.current = window.setInterval(() => {
        const current = replayerRef.current?.getCurrentTime?.() || 0;
        setProgress(current);
      }, 100);
    }
  };

  const handleRestart = () => {
    if (!replayerRef.current) return;
    replayerRef.current.play(0);
    setProgress(0);
    setPlaying(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const current = replayerRef.current?.getCurrentTime?.() || 0;
      setProgress(current);
    }, 100);
  };

  const handleSeek = (value: number[]) => {
    if (!replayerRef.current) return;
    const time = value[0];
    setProgress(time);
    if (playing) {
      replayerRef.current.play(time);
    } else {
      replayerRef.current.pause(time);
    }
  };

  const handleSpeedChange = () => {
    const speeds = [1, 2, 4, 8];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setSpeed(newSpeed);
    if (replayerRef.current) {
      replayerRef.current.setConfig({ speed: newSpeed });
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading session recording...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-destructive">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={fullscreen ? 'fixed inset-4 z-50 flex flex-col' : ''}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4" />
          Session Recording {leadName && `- ${leadName}`}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">{formatTime(duration)}</Badge>
          <Button variant="ghost" size="icon" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={fullscreen ? 'flex-1 flex flex-col' : ''}>
        {/* Replay container */}
        <div
          ref={containerRef}
          className={`bg-muted rounded-lg overflow-hidden border ${fullscreen ? 'flex-1' : 'h-[400px]'}`}
          style={{ position: 'relative' }}
        />

        {/* Controls */}
        <div className="mt-3 space-y-2">
          <Slider
            value={[progress]}
            max={duration}
            step={100}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePlay}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={handleRestart}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleSpeedChange}>
                {speed}x
              </Button>
            </div>
            <span className="text-sm text-muted-foreground font-mono">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
