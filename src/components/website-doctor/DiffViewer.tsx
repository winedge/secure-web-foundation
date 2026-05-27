interface Props {
  diff?: string | null;
}

export function DiffViewer({ diff }: Props) {
  if (!diff) return <div className="text-xs text-muted-foreground">No diff available.</div>;
  const lines = diff.split('\n');
  return (
    <pre className="text-xs bg-muted rounded overflow-auto max-h-80 font-mono">
      {lines.map((ln, i) => {
        const isAdd = ln.startsWith('+') && !ln.startsWith('+++');
        const isDel = ln.startsWith('-') && !ln.startsWith('---');
        const isHunk = ln.startsWith('@@');
        const isMeta = ln.startsWith('diff ') || ln.startsWith('index ') || ln.startsWith('+++') || ln.startsWith('---');
        const bg =
          isAdd ? 'bg-emerald-500/15 text-emerald-300'
          : isDel ? 'bg-red-500/15 text-red-300'
          : isHunk ? 'bg-primary/10 text-primary'
          : isMeta ? 'text-muted-foreground'
          : '';
        return (
          <div key={i} className={`px-3 ${bg} whitespace-pre`}>
            <span className="inline-block w-8 text-right pr-2 text-muted-foreground select-none">{i + 1}</span>
            {ln || ' '}
          </div>
        );
      })}
    </pre>
  );
}
