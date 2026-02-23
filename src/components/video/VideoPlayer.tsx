import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Scene {
  scene_number: number;
  duration_seconds: number;
  visual_description: string;
  text_overlay: string;
  voiceover: string;
  music_mood: string;
  transition: string;
}

interface SceneFrame {
  scene_number: number;
  image_url: string | null;
}

interface VideoPlayerProps {
  scenes: Scene[];
  frames: SceneFrame[];
  title: string;
  format: string;
  openingHook?: string;
  closingCta?: string;
  voiceoverFullText?: string;
}

export function VideoPlayer({ scenes, frames, title, format, openingHook, closingCta, voiceoverFullText }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(0);

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
  const currentScene = scenes[currentSceneIndex];
  const currentFrame = frames.find(f => f.scene_number === currentScene?.scene_number);

  const speakText = useCallback((text: string) => {
    if (isMuted || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    // Pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) 
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices[0];
    if (preferred) utterance.voice = preferred;
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  const playScene = useCallback((index: number) => {
    if (index >= scenes.length) {
      setIsPlaying(false);
      setCurrentSceneIndex(0);
      setSceneProgress(0);
      stopSpeech();
      return;
    }

    setCurrentSceneIndex(index);
    setSceneProgress(0);

    const scene = scenes[index];
    // Build voiceover: opening hook for first scene, closing CTA for last, scene voiceover always
    let voText = scene.voiceover || '';
    if (index === 0 && openingHook) voText = openingHook + '. ' + voText;
    if (index === scenes.length - 1 && closingCta) voText = voText + '. ' + closingCta;
    speakText(voText);

    const duration = scene.duration_seconds * 1000;
    startTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setSceneProgress(progress);

      // Calculate total elapsed
      const priorDuration = scenes.slice(0, index).reduce((s, sc) => s + sc.duration_seconds, 0);
      setTotalElapsed(priorDuration + (elapsed / 1000));

      if (elapsed >= duration) {
        if (timerRef.current) clearInterval(timerRef.current);
        playScene(index + 1);
      }
    }, 50);
  }, [scenes, openingHook, closingCta, speakText, stopSpeech]);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeech();
    } else {
      setIsPlaying(true);
      playScene(currentSceneIndex);
    }
  }, [isPlaying, currentSceneIndex, playScene, stopSpeech]);

  const handleNext = useCallback(() => {
    if (currentSceneIndex < scenes.length - 1) {
      stopSpeech();
      if (timerRef.current) clearInterval(timerRef.current);
      if (isPlaying) {
        playScene(currentSceneIndex + 1);
      } else {
        setCurrentSceneIndex(currentSceneIndex + 1);
        setSceneProgress(0);
      }
    }
  }, [currentSceneIndex, scenes.length, isPlaying, playScene, stopSpeech]);

  const handlePrev = useCallback(() => {
    if (currentSceneIndex > 0) {
      stopSpeech();
      if (timerRef.current) clearInterval(timerRef.current);
      if (isPlaying) {
        playScene(currentSceneIndex - 1);
      } else {
        setCurrentSceneIndex(currentSceneIndex - 1);
        setSceneProgress(0);
      }
    }
  }, [currentSceneIndex, isPlaying, playScene, stopSpeech]);

  const toggleMute = useCallback(() => {
    if (!isMuted) stopSpeech();
    setIsMuted(m => !m);
  }, [isMuted, stopSpeech]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeech();
    };
  }, [stopSpeech]);

  // Load voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const overallProgress = totalDuration > 0 ? (totalElapsed / totalDuration) * 100 : 0;

  const aspectStyle = {
    aspectRatio: format === '9:16' ? '9/16' : format === '1:1' ? '1/1' : '16/9',
  };

  return (
    <Card ref={containerRef} className="overflow-hidden border-2 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Video Preview — {title}
          </span>
          <Badge variant="outline">Scene {currentSceneIndex + 1}/{scenes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Video Frame Area */}
        <div
          className="relative bg-black rounded-lg overflow-hidden mx-auto max-w-2xl"
          style={{ ...aspectStyle, maxHeight: isFullscreen ? '80vh' : '500px' }}
        >
          {/* Frame Image */}
          {currentFrame?.image_url ? (
            <img
              src={currentFrame.image_url}
              alt={`Scene ${currentScene?.scene_number}`}
              className="w-full h-full object-cover transition-opacity duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="text-center p-6">
                <p className="text-white/60 text-sm">Scene {currentScene?.scene_number}</p>
                <p className="text-white/40 text-xs mt-1">{currentScene?.visual_description}</p>
              </div>
            </div>
          )}

          {/* Text Overlay */}
          {currentScene?.text_overlay && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
              <p className="text-white text-center font-bold text-lg drop-shadow-lg animate-in fade-in duration-500">
                {currentScene.text_overlay}
              </p>
            </div>
          )}

          {/* Scene transition indicator */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-black/50 text-white border-0 text-xs backdrop-blur-sm">
              {currentScene?.music_mood}
            </Badge>
          </div>

          {/* Play overlay when paused */}
          {!isPlaying && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
            >
              <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center">
                <Play className="h-8 w-8 text-primary-foreground ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* Scene Progress Bar */}
        <div className="space-y-1">
          <Progress value={sceneProgress} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Scene {currentSceneIndex + 1}: {currentScene?.duration_seconds}s</span>
            <span>{Math.floor(totalElapsed)}s / {totalDuration}s</span>
          </div>
        </div>

        {/* Overall Progress */}
        <Progress value={overallProgress} className="h-0.5" />

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" onClick={handlePrev} disabled={currentSceneIndex === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={handlePlay} className="h-10 w-10">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={handleNext} disabled={currentSceneIndex >= scenes.length - 1}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button size="icon" variant="ghost" onClick={toggleMute}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Current Voiceover Text */}
        {currentScene?.voiceover && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">🎙️ Voiceover</p>
            <p className="text-sm italic text-foreground">"{currentScene.voiceover}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
