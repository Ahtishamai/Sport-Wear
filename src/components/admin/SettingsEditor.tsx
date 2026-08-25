'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import type { SiteSettings } from '@/lib/settings';
import { AdminPage, Button, Card, Checkbox, Input, Textarea, useToast } from './ui';
import { ImageField } from './MediaPicker';
import { Icon } from '@/components/site/Icon';

export function SettingsEditor({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<SiteSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setS((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  async function save() {
    setBusy(true);
    try {
      await api.saveSettings(s);
      toast('Settings saved');
      setDirty(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage
      title="Site settings"
      description="Global content — the header, footer, contact details, quote drawer copy and analytics."
      actions={
        <Button variant="yellow" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : dirty ? 'Save settings' : 'Saved'}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <Card title="Brand">
            <div className="grid gap-4">
              <div>
                <span className="field-label">Site name</span>
                <Input value={s.siteName} onChange={(e) => set('siteName', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Tagline</span>
                <Input value={s.tagline} onChange={(e) => set('tagline', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Header logo (dark)</span>
                <ImageField value={s.logoDark} onChange={(v) => set('logoDark', v)} folder="brand" />
              </div>
              <div>
                <span className="field-label">Footer logo (light)</span>
                <ImageField value={s.logoLight} onChange={(v) => set('logoLight', v)} folder="brand" />
              </div>
            </div>
          </Card>

          <Card title="Announcement bar">
            <Checkbox
              label="Show the announcement bar"
              checked={s.announcementEnabled}
              onChange={(e) => set('announcementEnabled', e.target.checked)}
            />
            <div className="mt-4">
              <span className="field-label">Messages (separated by ✦ on the site)</span>
              <StringList
                values={s.announcement}
                onChange={(v) => set('announcement', v)}
                placeholder="FREE DIGITAL MOCKUP IN 24 HOURS"
              />
            </div>
          </Card>

          <Card title="Contact details">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="field-label">Phone (display)</span>
                  <Input value={s.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div>
                  <span className="field-label">Phone (tel: link)</span>
                  <Input value={s.phoneHref} onChange={(e) => set('phoneHref', e.target.value)} />
                </div>
              </div>
              <div>
                <span className="field-label">Email</span>
                <Input value={s.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Address</span>
                <Input value={s.address} onChange={(e) => set('address', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card title="Footer">
            <div className="grid gap-4">
              <div>
                <span className="field-label">Blurb</span>
                <Textarea
                  rows={3}
                  value={s.footerBlurb}
                  onChange={(e) => set('footerBlurb', e.target.value)}
                />
              </div>
              <div>
                <span className="field-label">Copyright line</span>
                <Input value={s.copyright} onChange={(e) => set('copyright', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Bottom-right line</span>
                <Input value={s.footerMeta} onChange={(e) => set('footerMeta', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Social links</span>
                <div className="space-y-2">
                  {s.social.map((soc, i) => (
                    <div key={i} className="flex gap-1.5">
                      <Input
                        value={soc.label}
                        onChange={(e) =>
                          set(
                            'social',
                            s.social.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                          )
                        }
                        placeholder="Instagram"
                        className="!py-1.5 text-[12px]"
                      />
                      <Input
                        value={soc.short}
                        onChange={(e) =>
                          set(
                            'social',
                            s.social.map((x, j) => (j === i ? { ...x, short: e.target.value } : x))
                          )
                        }
                        placeholder="ig"
                        className="!w-[70px] !py-1.5 text-[12px]"
                      />
                      <Input
                        value={soc.href}
                        onChange={(e) =>
                          set(
                            'social',
                            s.social.map((x, j) => (j === i ? { ...x, href: e.target.value } : x))
                          )
                        }
                        placeholder="https://…"
                        className="!py-1.5 text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => set('social', s.social.filter((_, j) => j !== i))}
                        aria-label="Remove social link"
                        className="px-1 text-[#8A8C93] hover:text-[#C42027]"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => set('social', [...s.social, { label: '', short: '', href: '' }])}
                >
                  + Add social link
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card
            title="Quote drawer"
            description="The global request-a-quote panel that every CTA opens."
          >
            <div className="grid gap-4">
              <div>
                <span className="field-label">Eyebrow</span>
                <Input value={s.quoteEyebrow} onChange={(e) => set('quoteEyebrow', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Heading</span>
                <Input value={s.quoteHeadline} onChange={(e) => set('quoteHeadline', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Reassurance line under the button</span>
                <Textarea
                  rows={2}
                  value={s.quoteReassurance}
                  onChange={(e) => set('quoteReassurance', e.target.value)}
                />
              </div>
              <div>
                <span className="field-label">Success heading</span>
                <Input
                  value={s.quoteSuccessTitle}
                  onChange={(e) => set('quoteSuccessTitle', e.target.value)}
                />
              </div>
              <div>
                <span className="field-label">Success body</span>
                <Textarea
                  rows={3}
                  value={s.quoteSuccessBody}
                  onChange={(e) => set('quoteSuccessBody', e.target.value)}
                />
              </div>
              <div>
                <span className="field-label">Timing options</span>
                <StringList
                  values={s.deadlineOptions}
                  onChange={(v) => set('deadlineOptions', v)}
                  placeholder="2-week rush"
                />
              </div>
              <div>
                <span className="field-label">Sport options</span>
                <StringList
                  values={s.sportOptions}
                  onChange={(v) => set('sportOptions', v)}
                  placeholder="Baseball"
                />
              </div>
            </div>
          </Card>

          <Card title="Default SEO" description="Used when a page has no SEO fields of its own.">
            <div className="grid gap-4">
              <div>
                <span className="field-label">Default title</span>
                <Input
                  value={s.defaultSeoTitle}
                  onChange={(e) => set('defaultSeoTitle', e.target.value)}
                />
              </div>
              <div>
                <span className="field-label">Default description</span>
                <Textarea
                  rows={3}
                  value={s.defaultSeoDescription}
                  onChange={(e) => set('defaultSeoDescription', e.target.value)}
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  {s.defaultSeoDescription.length} characters
                </p>
              </div>
            </div>
          </Card>

          <Card
            title="Analytics"
            description="Quote and contact submissions push conversion events to the data layer automatically."
          >
            <div className="grid gap-4">
              <div>
                <span className="field-label">Google Tag Manager ID</span>
                <Input
                  value={s.gtmId}
                  onChange={(e) => set('gtmId', e.target.value)}
                  placeholder="GTM-XXXXXXX"
                />
              </div>
              <div>
                <span className="field-label">GA4 measurement ID</span>
                <Input
                  value={s.ga4Id}
                  onChange={(e) => set('ga4Id', e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  Only used when no GTM container is set.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}

function StringList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              value={v}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={placeholder}
              className="!py-1.5 text-[13px]"
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label="Remove"
              className="px-1 text-[#8A8C93] hover:text-[#C42027]"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => onChange([...values, ''])}>
        + Add
      </Button>
    </div>
  );
}
