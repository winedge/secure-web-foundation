import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Loader2, AlertCircle, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import 'rrweb/dist/style.css';

interface SessionReplayViewerProps {
  recordingPath: string;
  leadName?: string;
}

export function SessionReplayViewer({ recordingPath, leadName }: SessionReplayViewerProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rrwebRootRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<number>();
  const rafRef = useRef<number>();

  // Listen for native fullscreen changes
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: downloadError } = await supabase.storage
          .from('session-recordings')
          .download(recordingPath);

        if (downloadError) throw new Error(downloadError.message);
        if (cancelled) return;

        const text = await data.text();
        const events = JSON.parse(text);

        if (!events || events.length < 2) {
          setError('Recording is too short to replay.');
          return;
        }

        const rrwebModule = await import('rrweb');
        const Replayer = rrwebModule.Replayer;
        if (cancelled) return;

        // Destroy previous replayer
        if (replayerRef.current) {
          try { replayerRef.current.destroy(); } catch (_) {}
          replayerRef.current = null;
        }

        // Remove old rrweb root if it exists
        if (rrwebRootRef.current && wrapperRef.current?.contains(rrwebRootRef.current)) {
          wrapperRef.current.removeChild(rrwebRootRef.current);
        }

        // Create a standalone div for rrweb outside React's control
        const rrwebRoot = document.createElement('div');
        rrwebRoot.style.width = '100%';
        rrwebRoot.style.height = '100%';
        rrwebRootRef.current = rrwebRoot;

        if (wrapperRef.current) {
          wrapperRef.current.appendChild(rrwebRoot);
        }

        const replayer = new Replayer(events, {
          root: rrwebRoot,
          skipInactive: true,
          showWarning: false,
          showDebug: false,
          speed: 1,
          UNSAFE_replayCanvas: false,
          mouseTail: {
            duration: 500,
            lineCap: 'round',
            lineWidth: 3,
            strokeStyle: 'hsl(var(--primary))',
          },
        });

        replayerRef.current = replayer;

        const meta = replayer.getMetaData();
        setDuration(meta.totalTime);

        replayer.on('finish', () => {
          setPlaying(false);
          stopProgressTracking();
        });

      } catch (err: any) {
        console.error('Failed to load recording:', err);
        if (!cancelled) setError(err.message || 'Failed to load recording');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (replayerRef.current) {
        try { replayerRef.current.destroy(); } catch (_) {}
        replayerRef.current = null;
      }
      stopProgressTracking();
      if (rrwebRootRef.current && wrapperRef.current?.contains(rrwebRootRef.current)) {
        wrapperRef.current.removeChild(rrwebRootRef.current);
        rrwebRootRef.current = null;
      }
    };
  }, [recordingPath]);

  // Use requestAnimationFrame for smoother progress tracking
  const startProgressTracking = () => {
    stopProgressTracking();
    const tick = () => {
      const current = replayerRef.current?.getCurrentTime?.() || 0;
      setProgress(current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopProgressTracking = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const handlePlay = () => {
    if (!replayerRef.current) return;
    if (playing) {
      replayerRef.current.pause();
      setPlaying(false);
      stopProgressTracking();
    } else {
      replayerRef.current.play(progress);
      setPlaying(true);
      startProgressTracking();
    }
  };

  const handleRestart = () => {
    if (!replayerRef.current) return;
    replayerRef.current.play(0);
    setProgress(0);
    setPlaying(true);
    startProgressTracking();
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

  const toggleFullscreen = async () => {
    if (!cardRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await cardRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      ref={cardRef}
      className={`${isFullscreen ? 'rounded-none border-none flex flex-col h-screen' : ''}`}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4" />
          Session Recording {leadName && `- ${leadName}`}
        </CardTitle>
        <div className="flex items-center gap-2">
          {!loading && !error && <Badge variant="outline" className="font-mono">{formatTime(duration)}</Badge>}
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isFullscreen ? 'flex-1 flex flex-col min-h-0' : ''}>
        {/* Outer wrapper holds rrweb root (imperative) and React overlays */}
        <div className={`relative bg-muted rounded-lg overflow-hidden border ${isFullscreen ? 'flex-1' : 'h-[400px]'}`}>
          {/* rrweb attaches here - React never touches children of this div */}
          <div ref={wrapperRef} className="absolute inset-0" />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading session recording...</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10 text-destructive">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        {!loading && !error && (
          <div className="mt-3 space-y-2 shrink-0">
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
                <Button variant="outline" size="sm" onClick={handleSpeedChange} className="font-mono min-w-[3rem]">
                  <SkipForward className="h-3 w-3 mr-1" />
                  {speed}x
                </Button>
              </div>
              <span className="text-sm text-muted-foreground font-mono">
                {formatTime(progress)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
