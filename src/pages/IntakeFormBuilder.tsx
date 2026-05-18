import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Save, Upload, Eye, Link as LinkIcon, Palette, Type, FormInput,
  Plus, Trash2, GripVertical, Loader2, Copy, ExternalLink, Sparkles, LayoutTemplate, Search,
} from 'lucide-react';
import { useFirmBranding, useUpsertBranding, useUploadLogo, type CustomField } from '@/hooks/use-firm-branding';
import { useFirm } from '@/hooks/use-firm';
import { ThemeGallery } from '@/components/landing-builder/ThemeGallery';
import { AiThemeTweaker } from '@/components/landing-builder/AiThemeTweaker';
import { SectionsTab } from '@/components/landing-builder/SectionsTab';
import { SeoSettingsPanel } from '@/components/landing-builder/SeoSettingsPanel';
import { LANDING_THEMES, type LandingTheme } from '@/lib/landing-themes';
import type { Section, SectionTheme } from '@/lib/landing-sections/types';
import type { SeoConfig } from '@/lib/landing-seo';
import { toast } from 'sonner';

const DEFAULT_FIELDS = [
  { id: 'first_name', label: 'First Name' },
  { id: 'last_name', label: 'Last Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'state', label: 'State' },
  { id: 'city', label: 'City' },
  { id: 'zip_code', label: 'ZIP Code' },
  { id: 'address', label: 'Address' },
  { id: 'age_bucket', label: 'Age Range' },
  { id: 'tort_type', label: 'Case Type' },
  { id: 'diagnosis_details', label: 'Diagnosis Details' },
  { id: 'exposure_details', label: 'Exposure Details' },
];

export default function IntakeFormBuilder() {
  const { data: firm } = useFirm();
  const { data: branding, isLoading } = useFirmBranding();
  const upsertBranding = useUpsertBranding();
  const uploadLogo = useUploadLogo();

  const [slug, setSlug] = useState('');
  const [firmDisplayName, setFirmDisplayName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#0f172a');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [headingText, setHeadingText] = useState('Submit Your Claim');
  const [descriptionText, setDescriptionText] = useState('Fill out the form below to get started with your case evaluation.');
  const [visibleFields, setVisibleFields] = useState<string[]>(
    DEFAULT_FIELDS.map(f => f.id)
  );
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [themeKey, setThemeKey] = useState<string | null>(null);
  const [typography, setTypography] = useState<Record<string, any>>({});
  const [layoutConfig, setLayoutConfig] = useState<Record<string, any>>({});
  const [heroConfig, setHeroConfig] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<Section[]>([]);
  const [seoConfig, setSeoConfig] = useState<SeoConfig>({});
  const [activeTab, setActiveTab] = useState<'sections' | 'themes' | 'branding' | 'fields' | 'seo' | 'preview'>('sections');

  // Populate from existing branding
  useEffect(() => {
    if (branding) {
      setSlug(branding.slug);
      setFirmDisplayName(branding.firm_display_name || '');
      setLogoUrl(branding.logo_url);
      setPrimaryColor(branding.primary_color);
      setBackgroundColor(branding.background_color);
      setAccentColor(branding.accent_color);
      setHeadingText(branding.heading_text);
      setDescriptionText(branding.description_text);
      setVisibleFields(
        Array.isArray(branding.visible_fields)
          ? branding.visible_fields
          : DEFAULT_FIELDS.map(f => f.id)
      );
      setCustomFields(
        Array.isArray(branding.custom_fields)
          ? branding.custom_fields
          : []
      );
      setThemeKey((branding as any).theme_key ?? null);
      setTypography((branding as any).typography ?? {});
      setLayoutConfig((branding as any).layout_config ?? {});
      setHeroConfig((branding as any).hero_config ?? {});
      setSections(Array.isArray((branding as any).sections) ? (branding as any).sections : []);
      setSeoConfig(((branding as any).seo_config ?? {}) as SeoConfig);
    } else if (firm) {
      // Auto-generate slug from firm name
      setSlug(firm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      setFirmDisplayName(firm.name);
    }
  }, [branding, firm]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    const url = await uploadLogo.mutateAsync(file);
    setLogoUrl(url);
    toast.success('Logo uploaded!');
  }, [uploadLogo]);

  const handleSave = async () => {
    if (!slug || slug.length < 1) {
      toast.error('Please enter a URL slug');
      return;
    }
    await upsertBranding.mutateAsync({
      slug,
      firm_display_name: firmDisplayName || null,
      logo_url: logoUrl,
      primary_color: primaryColor,
      background_color: backgroundColor,
      accent_color: accentColor,
      heading_text: headingText,
      description_text: descriptionText,
      visible_fields: visibleFields,
      custom_fields: customFields,
      theme_key: themeKey,
      typography,
      layout_config: layoutConfig,
      hero_config: heroConfig,
      sections,
      seo_config: seoConfig,
    } as any);
  };

  const applyTheme = (theme: LandingTheme) => {
    setThemeKey(theme.key);
    setPrimaryColor(theme.colors.primary);
    setBackgroundColor(theme.colors.background);
    setAccentColor(theme.colors.accent);
    setTypography({ heading: theme.typography.heading, body: theme.typography.body });
    setLayoutConfig({ ...theme.layout });
    setHeroConfig({ ...theme.hero });
    toast.success(`Applied "${theme.name}" theme`);
  };

  const applyAiUpdates = (updates: Record<string, any>) => {
    if (updates.primary_color) setPrimaryColor(updates.primary_color);
    if (updates.background_color) setBackgroundColor(updates.background_color);
    if (updates.accent_color) setAccentColor(updates.accent_color);
    if (updates.heading_text) setHeadingText(updates.heading_text);
    if (updates.description_text) setDescriptionText(updates.description_text);
    if (updates.typography) setTypography((prev) => ({ ...prev, ...updates.typography }));
    if (updates.layout_config) setLayoutConfig((prev) => ({ ...prev, ...updates.layout_config }));
    if (updates.hero_config) setHeroConfig((prev) => ({ ...prev, ...updates.hero_config }));
    setThemeKey(null); // mark as custom
  };

  const toggleField = (fieldId: string) => {
    setVisibleFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const addCustomField = () => {
    setCustomFields(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        label: 'New Field',
        type: 'text',
        required: false,
      },
    ]);
  };

  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    setCustomFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const intakeUrl = `${window.location.origin}/intake/${slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(intakeUrl);
    toast.success('Intake URL copied!');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Landing Page Builder</h1>
            <p className="text-muted-foreground">
              Pick a theme, customize the look, and publish a branded landing page for your business
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open(`/intake/${slug}`, '_blank')} disabled={!slug}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview Live
            </Button>
            <Button onClick={handleSave} disabled={upsertBranding.isPending}>
              {upsertBranding.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Intake URL */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Your Landing Page URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-3 py-1.5 rounded-md truncate block flex-1">
                    {intakeUrl}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab buttons */}
        <div className="flex gap-2 border-b pb-2 flex-wrap">
          {[
            { id: 'sections' as const, label: 'Sections', icon: LayoutTemplate },
            { id: 'themes' as const, label: 'Themes', icon: Sparkles },
            { id: 'branding' as const, label: 'Branding & Colors', icon: Palette },
            { id: 'fields' as const, label: 'Form Fields', icon: FormInput },
            { id: 'seo' as const, label: 'SEO', icon: Search },
            { id: 'preview' as const, label: 'Preview', icon: Eye },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Sections Tab | the new multi-section composer */}
        {activeTab === 'sections' && (
          <SectionsTab
            sections={sections}
            onChange={setSections}
            themeKey={themeKey}
            theme={{
              primary: primaryColor,
              background: backgroundColor,
              accent: accentColor,
              headingFont: (typography as any)?.heading,
              bodyFont: (typography as any)?.body,
              radius: ((layoutConfig as any)?.radius ?? 'lg') as SectionTheme['radius'],
              spacing: ((layoutConfig as any)?.spacing ?? 'normal') as SectionTheme['spacing'],
              buttonStyle: ((layoutConfig as any)?.buttonStyle ?? 'solid') as SectionTheme['buttonStyle'],
              maxWidth: ((layoutConfig as any)?.maxWidth ?? 'normal') as SectionTheme['maxWidth'],
            }}
            visibleFormFields={visibleFields}
            customFormFields={customFields}
          />
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <SeoSettingsPanel
            value={seoConfig}
            onChange={setSeoConfig}
            context={{
              name: seoConfig.title || firmDisplayName || firm?.name || 'Your business',
              url: intakeUrl,
              logo: logoUrl || undefined,
              description: descriptionText,
            }}
          />
        )}

        {/* Themes Tab */}
        {activeTab === 'themes' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pick a starting theme</CardTitle>
                <CardDescription>
                  Choose a preset that matches your business. You can fully customize colors, fonts, and layout in the next tabs, or use the AI assistant below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeGallery selectedKey={themeKey} onSelect={applyTheme} />
              </CardContent>
            </Card>

            <AiThemeTweaker
              current={{
                primary_color: primaryColor,
                background_color: backgroundColor,
                accent_color: accentColor,
                heading_text: headingText,
                description_text: descriptionText,
                typography,
                layout_config: layoutConfig,
                hero_config: heroConfig,
              }}
              onApply={applyAiUpdates}
            />
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identity</CardTitle>
                <CardDescription>Your firm's branding on the intake form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/intake/</span>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="my-firm"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Firm Display Name</Label>
                  <Input
                    value={firmDisplayName}
                    onChange={(e) => setFirmDisplayName(e.target.value)}
                    placeholder="Smith & Associates"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain rounded-lg border" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="max-w-[200px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WebP. Max 2MB.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Colors</CardTitle>
                <CardDescription>Customize the form's color scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Primary</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Background</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
                {/* Color preview strip */}
                <div className="flex rounded-lg overflow-hidden h-8 border">
                  <div className="flex-1" style={{ backgroundColor: primaryColor }} />
                  <div className="flex-1" style={{ backgroundColor: accentColor }} />
                  <div className="flex-1" style={{ backgroundColor }} />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Intro Text
                </CardTitle>
                <CardDescription>The heading and description shown above the form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Heading</Label>
                  <Input
                    value={headingText}
                    onChange={(e) => setHeadingText(e.target.value)}
                    placeholder="Submit Your Claim"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                    placeholder="Fill out the form below..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fields Tab */}
        {activeTab === 'fields' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Standard Fields</CardTitle>
                <CardDescription>Toggle which fields appear on your form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEFAULT_FIELDS.map(field => (
                  <div key={field.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{field.label}</span>
                      {['first_name', 'last_name', 'email', 'phone', 'state', 'tort_type'].includes(field.id) && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <Switch
                      checked={visibleFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                      disabled={['first_name', 'last_name', 'email', 'phone', 'state', 'tort_type'].includes(field.id)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Custom Fields</CardTitle>
                    <CardDescription>Add your own fields to the form</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={addCustomField}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {customFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No custom fields yet. Click "Add Field" to create one.
                  </p>
                )}
                {customFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={field.label}
                        onChange={(e) => updateCustomField(index, { label: e.target.value })}
                        placeholder="Field label"
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeCustomField(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={field.type}
                        onValueChange={(v) => updateCustomField(index, { type: v as CustomField['type'] })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => updateCustomField(index, { required: checked })}
                        />
                        <Label className="text-sm">Required</Label>
                      </div>
                    </div>
                    {field.type === 'select' && (
                      <div className="space-y-1">
                        <Label className="text-xs">Options (comma-separated)</Label>
                        <Input
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => updateCustomField(index, {
                            options: e.target.value.split(',').map(o => o.trim()).filter(Boolean),
                          })}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <Card>
            <CardContent className="pt-6">
              <div
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor }}
              >
                {/* Preview Header */}
                <div className="px-6 py-4 border-b" style={{ backgroundColor: primaryColor }}>
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
                    ) : (
                      <div className="h-10 w-10 rounded flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                        <span className="text-white font-bold text-lg">
                          {(firmDisplayName || 'F').charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-white font-bold text-xl">{firmDisplayName || 'Your Firm'}</span>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="p-8 max-w-xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
                      {headingText}
                    </h2>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      {descriptionText}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {visibleFields.filter(f => DEFAULT_FIELDS.some(d => d.id === f)).map(fieldId => {
                      const field = DEFAULT_FIELDS.find(d => d.id === fieldId)!;
                      return (
                        <div key={fieldId} className="space-y-1">
                          <label className="text-sm font-medium" style={{ color: primaryColor }}>
                            {field.label}
                          </label>
                          <div
                            className="h-10 rounded-md border px-3 flex items-center"
                            style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}
                          >
                            <span className="text-xs text-gray-400">
                              {field.label}...
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {customFields.map(field => (
                      <div key={field.id} className="space-y-1">
                        <label className="text-sm font-medium" style={{ color: primaryColor }}>
                          {field.label} {field.required && '*'}
                        </label>
                        <div
                          className="rounded-md border px-3 flex items-center"
                          style={{
                            borderColor: '#e5e7eb',
                            backgroundColor: '#f9fafb',
                            height: field.type === 'textarea' ? '80px' : '40px',
                          }}
                        >
                          <span className="text-xs text-gray-400">{field.label}...</span>
                        </div>
                      </div>
                    ))}
                    <button
                      className="w-full py-3 rounded-md text-white font-medium text-sm mt-4"
                      style={{ backgroundColor: accentColor }}
                      disabled
                    >
                      Submit Free Evaluation
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
