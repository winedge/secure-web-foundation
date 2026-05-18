import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Settings2, Undo2, Redo2 } from 'lucide-react';
import type { Section, SectionTheme, VisibilityConfig, SectionAnimation, SectionBackground } from '@/lib/landing-sections/types';
import { newSection, SECTION_REGISTRY } from '@/lib/landing-sections/registry';
import { SectionList } from './SectionList';
import { SectionPicker } from './SectionPicker';
import { Inspector } from './Inspector';
import { MotionInspector } from './MotionInspector';
import { BackgroundInspector } from './BackgroundInspector';

import { AiSectionsAssistant } from './AiSectionsAssistant';
import { AiPageGenerator } from './AiPageGenerator';

import { SectionRenderer } from '@/components/landing-sections/SectionRenderer';
import { starterStack } from '@/lib/landing-sections/starter-stacks';
import { VisibilityEditor, intakeFormKeys } from './VisibilityEditor';
import { useBuilderHistory } from '@/hooks/use-builder-history';
import type { CustomField } from '@/hooks/use-firm-branding';

interface Props {
  sections: Section[];
  onChange: (sections: Section[]) => void;
  theme: SectionTheme;
  themeKey: string | null;
  /** Built-in form field names currently enabled in the intake form. */
  visibleFormFields?: string[];
  /** Custom intake fields (provides additional keys for form-response rules). */
  customFormFields?: CustomField[];
}

export function SectionsTab({ sections, onChange, theme, themeKey, visibleFormFields = [], customFormFields = [] }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(sections[0]?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selected = useMemo(() => sections.find((s) => s.id === selectedId) ?? null, [sections, selectedId]);

  // Undo/redo history; external `sections` prop changes reset the baseline.
  const history = useBuilderHistory<Section[]>(sections, onChange);
  useEffect(() => { history.reset(sections); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const commit = (next: Section[]) => history.commit(next);

  const addSection = (type: any) => {
    const s = newSection(type);
    commit([...sections, s]);
    setSelectedId(s.id);
  };
  const reorder = (next: Section[]) => commit(next);
  const toggleVis = (id: string) => commit(sections.map((s) => s.id === id ? { ...s, visible: !s.visible } : s));
  const duplicate = (id: string) => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const copy = { ...sections[idx], id: crypto.randomUUID() };
    commit([...sections.slice(0, idx + 1), copy, ...sections.slice(idx + 1)]);
    setSelectedId(copy.id);
  };
  const remove = (id: string) => {
    commit(sections.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const updateVisibility = (id: string, visibility: VisibilityConfig | undefined) =>
    commit(sections.map((s) => s.id === id ? { ...s, visibility } : s));
  const updateAnimation = (id: string, animation: SectionAnimation | undefined) =>
    commit(sections.map((s) => s.id === id ? { ...s, animation } : s));
  const updateBackground = (id: string, background: SectionBackground | undefined) =>
    commit(sections.map((s) => s.id === id ? { ...s, background } : s));


  const formFieldKeys = useMemo(
    () => intakeFormKeys(visibleFormFields, customFormFields),
    [visibleFormFields, customFormFields],
  );

  if (sections.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Settings2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Build your landing page</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Start with a ready-made set of sections for your theme, or build from scratch by adding sections one at a time.
        </p>
        <div className="flex gap-2 justify-center mt-6 flex-wrap">
          <AiPageGenerator hasExisting={false} theme={theme} onGenerated={(s) => { commit(s); setSelectedId(s[0]?.id ?? null); }} />
          <Button variant="outline" onClick={() => onChange(starterStack(themeKey))}>
            <Plus className="h-4 w-4 mr-2" /> Use starter stack
          </Button>
          <Button variant="ghost" onClick={() => setPickerOpen(true)}>
            Add single section
          </Button>
        </div>

        <SectionPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={addSection} />
      </Card>
    );
  }

  const selectedDef = selected ? SECTION_REGISTRY[selected.type] : null;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '260px minmax(0, 1fr) 320px' }}>
      {/* Left rail */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add section
          </Button>
          <Button variant="outline" size="icon" onClick={history.undo} disabled={!history.canUndo} title="Undo (⌘Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={history.redo} disabled={!history.canRedo} title="Redo (⇧⌘Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <AiPageGenerator
          hasExisting
          theme={theme}
          variant="compact"
          onGenerated={(s) => { commit(s); setSelectedId(s[0]?.id ?? null); }}
        />

        <Card className="p-2">
          <ScrollArea className="h-[520px] pr-1">
            <SectionList
              sections={sections}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={reorder}
              onToggleVisibility={toggleVis}
              onDuplicate={duplicate}
              onDelete={remove}
            />
          </ScrollArea>
        </Card>
        <AiSectionsAssistant sections={sections} onReplace={commit} />
      </div>

      {/* Live preview */}
      <Card className="overflow-hidden">
        <ScrollArea className="h-[700px]">
          <SectionRenderer
            sections={sections}
            theme={theme}
            selectable
            selectedId={selectedId ?? undefined}
            onSelect={setSelectedId}
            formSlot={<FormPlaceholder />}
          />
        </ScrollArea>
      </Card>

      {/* Inspector */}
      <Card className="p-4">
        <div className="mb-3 pb-3 border-b">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {selectedDef ? selectedDef.label : 'Select a section'}
          </div>
          {selectedDef && <p className="text-xs text-muted-foreground mt-1">{selectedDef.description}</p>}
        </div>
        <ScrollArea className="h-[600px] pr-2">
          {selected && selectedDef ? (
            <div className="space-y-4">
              <VisibilityEditor
                section={selected}
                onChange={(v) => updateVisibility(selected.id, v)}
                formFieldKeys={formFieldKeys}
              />
              <MotionInspector
                value={selected.animation}
                onChange={(a) => updateAnimation(selected.id, a)}
              />
              <BackgroundInspector
                value={selected.background}
                onChange={(b) => updateBackground(selected.id, b)}
                onApplyToAll={(b) => commit(sections.map((s) => ({ ...s, background: JSON.parse(JSON.stringify(b)) })))}
              />

              <Inspector
                schema={selectedDef.schema}
                value={selected.props}
                onChange={(next) => commit(sections.map((s) => s.id === selected.id ? { ...s, props: next } : s))}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Click a section in the list or preview to edit it here.</p>
          )}
        </ScrollArea>
      </Card>

      <SectionPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={addSection} />
    </div>
  );
}

function FormPlaceholder() {
  return (
    <div className="text-center text-sm text-muted-foreground p-6">
      <div className="font-medium mb-1">Intake form preview</div>
      <p className="text-xs">Configure fields in the "Form Fields" tab. The live form appears here on your published page.</p>
    </div>
  );
}
