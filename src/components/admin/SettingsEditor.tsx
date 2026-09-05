'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import type { SiteSettings } from '@/lib/settings';
import type { MailSummary } from '@/lib/mail';
import { AdminPage, Button, Card, Checkbox, Input, Select, Textarea, useToast } from './ui';
import { ImageField } from './MediaPicker';
import { Icon } from '@/components/site/Icon';

export function SettingsEditor({
  settings,
  paypalSecretSet,
  mail,
}: {
  settings: SiteSettings;
  paypalSecretSet: boolean;
  mail: MailSummary;
}) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<SiteSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<null | {
    ok: boolean;
    error?: string;
    hint?: string;
    orders?: number;
    stages?: string[];
    sample?: string;
  }>(null);

  // The secret is write-only: it is never sent to the browser, so this holds
  // only what the admin types now. Blank on save means "keep what is stored".
  const [secret, setSecret] = useState('');
  const [secretSet, setSecretSet] = useState(paypalSecretSet);
  // A client ID only works with the secret from the same PayPal app, so
  // changing one without the other is a silent mismatch.
  const [originalClientId] = useState(settings.paypalClientId);
  const clientIdChanged =
    s.paypalClientId.trim() !== originalClientId.trim() && s.paypalClientId.trim() !== '';
  const secretLooksStale = secretSet && clientIdChanged && !secret.trim();
  const [payResult, setPayResult] = useState<null | {
    ok: boolean;
    message: string;
    detail?: string;
  }>(null);

  // The mail server. Its password is write-only for the same reason the
  // PayPal secret is: it never leaves the server, so this holds only what
  // is typed now, and blank on save means "keep the stored one".
  const [smtp, setSmtpAll] = useState(() => {
    const { passSet, ready, ...rest } = mail;
    return rest;
  });
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpPassSet, setSmtpPassSet] = useState(mail.passSet);
  const [smtpTestTo, setSmtpTestTo] = useState('');
  const [mailTesting, setMailTesting] = useState(false);
  const [mailResult, setMailResult] = useState<null | {
    ok: boolean;
    message: string;
    detail?: string;
  }>(null);

  function setSmtp<K extends keyof typeof smtp>(k: K, v: (typeof smtp)[K]) {
    setSmtpAll((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  // Tests what is on screen, not what is stored, so a wrong port or
  // password is caught while the admin is still looking at the field.
  async function testEmail() {
    setMailTesting(true);
    setMailResult(null);
    try {
      const res = await fetch('/api/admin/smtp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...smtp, pass: smtpPass, to: smtpTestTo }),
      });
      setMailResult(await res.json());
    } catch {
      setMailResult({ ok: false, message: 'Could not reach the server.' });
    } finally {
      setMailTesting(false);
    }
  }

  async function testPayments() {
    setTesting(true);
    setPayResult(null);
    try {
      const res = await fetch('/api/admin/paypal-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: s.paypalClientId,
          mode: s.paypalMode,
          secret,
        }),
      });
      setPayResult(await res.json());
    } catch {
      setPayResult({ ok: false, message: 'Could not reach the server.' });
    } finally {
      setTesting(false);
    }
  }

  // Checking the sheet before saving turns a dead tracking page into a fixable
  // message while the admin is still looking at the field.
  async function testSheet() {
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch('/api/admin/track-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: s.trackingSheetUrl, tab: s.trackingSheetTab }),
      });
      setTest(await res.json());
    } catch {
      setTest({ ok: false, error: 'Could not reach the server.' });
    } finally {
      setTesting(false);
    }
  }

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setS((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  async function save() {
    setBusy(true);
    try {
      await api.saveSettings({
        ...s,
        ...(secret.trim() ? { paypalSecret: secret } : {}),
        smtp: { ...smtp, pass: smtpPass.trim() ? smtpPass : '' },
      });
      if (smtpPass.trim()) {
        setSmtpPass('');
        setSmtpPassSet(true);
      }
      if (secret.trim()) {
        setSecret('');
        setSecretSet(true);
      }
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
            title="Pricing"
            description="Turn every price off across the site at once."
          >
            <Checkbox
              label="Show prices on the site"
              checked={s.showPrices !== false}
              onChange={(e) => set('showPrices', e.target.checked)}
            />
            <p className="mt-2 text-[12px] text-[#8A8C93]">
              When this is off, prices disappear from product pages, collection pages, the home
              page and the team packages — visitors are asked for a quote instead. Team store
              checkout is unaffected, since people are paying there.
            </p>
          </Card>

          <Card
            title="Payments"
            description="Card and PayPal checkout for team stores. Quote requests are unaffected."
          >
            <div className="grid gap-4">
              <Checkbox
                label="Accept payments in team stores"
                checked={s.paypalEnabled}
                onChange={(e) => set('paypalEnabled', e.target.checked)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="field-label">Environment</span>
                  <Select
                    value={s.paypalMode}
                    onChange={(e) => set('paypalMode', e.target.value === 'live' ? 'live' : 'sandbox')}
                  >
                    <option value="sandbox">Sandbox — test money only</option>
                    <option value="live">Live — real money</option>
                  </Select>
                </div>
                <div>
                  <span className="field-label">Currency</span>
                  <Input
                    value={s.storeCurrency}
                    onChange={(e) => set('storeCurrency', e.target.value.toUpperCase())}
                    placeholder="USD"
                    maxLength={8}
                  />
                </div>
              </div>

              <div>
                <span className="field-label">PayPal client ID</span>
                <Input
                  value={s.paypalClientId}
                  onChange={(e) => set('paypalClientId', e.target.value.trim())}
                  placeholder="AY…"
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  From developer.paypal.com → Apps &amp; Credentials. Make sure it comes from the
                  same environment selected above.
                </p>
              </div>

              <div>
                <span className="field-label">PayPal secret</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={secretSet ? 'Saved — type to replace' : 'EL…'}
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  {secretSet
                    ? 'A secret is saved. It is never shown again — leave this blank to keep it.'
                    : 'Stored separately from the rest of the settings and never sent back to the browser.'}
                </p>
                {secretLooksStale && (
                  <p className="mt-2 border border-[#F0DCA8] bg-[#FDF6E3] px-3 py-2 text-[12px] text-[#8A6D1B]">
                    You changed the client ID but not the secret. Paste the secret from the
                    <b> same PayPal app</b> — the saved one belongs to the previous client ID and
                    will be rejected.
                  </p>
                )}
              </div>

              <Button variant="ghost" size="sm" onClick={testPayments} disabled={testing}>
                {testing ? 'Checking…' : 'Test connection'}
              </Button>

              {payResult && (
                <div
                  className={
                    'border px-4 py-3 text-[13px] ' +
                    (payResult.ok
                      ? 'border-[#BFE3CC] bg-[#E4F4EA] text-[#1F8A4C]'
                      : 'border-[#F3C6C8] bg-[#FBE7E8] text-[#C42027]')
                  }
                >
                  <p className="font-semibold">{payResult.message}</p>
                  {payResult.detail && <p className="mt-1">{payResult.detail}</p>}
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Email"
            description="The mailbox your site sends from, and what an order confirmation says."
          >
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div>
                  <span className="field-label">Mail server (SMTP)</span>
                  <Input
                    value={smtp.host}
                    onChange={(e) => setSmtp('host', e.target.value.trim())}
                    placeholder="smtp.hostinger.com"
                  />
                </div>
                <div>
                  <span className="field-label">Port</span>
                  <Input
                    type="number"
                    value={String(smtp.port)}
                    onChange={(e) => setSmtp('port', Number(e.target.value) || 587)}
                    placeholder="465"
                  />
                </div>
              </div>

              <Checkbox
                label="Use SSL (tick for port 465, leave clear for 587)"
                checked={smtp.secure}
                onChange={(e) => setSmtp('secure', e.target.checked)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="field-label">Mailbox username</span>
                  <Input
                    value={smtp.user}
                    onChange={(e) => setSmtp('user', e.target.value.trim())}
                    placeholder="orders@design-sportswear.com"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <span className="field-label">Mailbox password</span>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder={smtpPassSet ? 'Saved — type to replace' : 'The mailbox password'}
                  />
                </div>
              </div>
              <p className="-mt-2 text-[12px] text-[#8A8C93]">
                {smtpPassSet
                  ? 'A password is saved. It is never shown again — leave this blank to keep it.'
                  : 'Stored separately from the rest of the settings and never sent back to the browser.'}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="field-label">Sends as (name)</span>
                  <Input
                    value={smtp.fromName}
                    onChange={(e) => setSmtp('fromName', e.target.value)}
                    placeholder={s.siteName}
                  />
                </div>
                <div>
                  <span className="field-label">Sends from (address)</span>
                  <Input
                    value={smtp.fromEmail}
                    onChange={(e) => setSmtp('fromEmail', e.target.value.trim())}
                    placeholder="orders@design-sportswear.com"
                  />
                </div>
              </div>

              <div>
                <span className="field-label">Replies go to</span>
                <Input
                  value={smtp.replyTo}
                  onChange={(e) => setSmtp('replyTo', e.target.value.trim())}
                  placeholder={s.email}
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  Leave blank and replies go to the sending address above.
                </p>
              </div>

              <div className="border-t border-[#E7E7E9] pt-4">
                <span className="field-label">Send a test to</span>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={smtpTestTo}
                      onChange={(e) => setSmtpTestTo(e.target.value.trim())}
                      placeholder="your own address"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={testEmail}
                    disabled={mailTesting}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {mailTesting ? 'Sending…' : smtpTestTo ? 'Send test' : 'Check connection'}
                  </Button>
                </div>
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  Uses what is typed above, saved or not — so you can get it right before saving.
                </p>
              </div>

              {mailResult && (
                <div
                  className={
                    'border px-4 py-3 text-[13px] ' +
                    (mailResult.ok
                      ? 'border-[#BFE3CC] bg-[#E4F4EA] text-[#1F8A4C]'
                      : 'border-[#F3C6C8] bg-[#FBE7E8] text-[#C42027]')
                  }
                >
                  <p className="font-semibold">{mailResult.message}</p>
                  {mailResult.detail && <p className="mt-1">{mailResult.detail}</p>}
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Order confirmation"
            description="What a customer gets after paying in a team store."
          >
            <div className="grid gap-4">
              <Checkbox
                label="Email a confirmation when an order is paid"
                checked={s.orderEmailsEnabled}
                onChange={(e) => set('orderEmailsEnabled', e.target.checked)}
              />

              <div>
                <span className="field-label">Send a copy to</span>
                <Input
                  value={s.orderEmailCopyTo}
                  onChange={(e) => set('orderEmailCopyTo', e.target.value)}
                  placeholder="orders@design-sportswear.com"
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  A blind copy of every order confirmation. Separate several addresses with commas.
                </p>
              </div>

              <div>
                <span className="field-label">Opening line</span>
                <Textarea
                  rows={3}
                  value={s.orderEmailIntro}
                  onChange={(e) => set('orderEmailIntro', e.target.value)}
                />
              </div>

              <div>
                <span className="field-label">Closing line</span>
                <Textarea
                  rows={2}
                  value={s.orderEmailFooter}
                  onChange={(e) => set('orderEmailFooter', e.target.value)}
                />
              </div>

              <a
                href="/api/admin/order-email/preview"
                target="_blank"
                rel="noopener"
                className="text-[13px] font-semibold text-ink underline"
              >
                Preview the email
              </a>
            </div>
          </Card>

          <Card
            title="Order tracking"
            description="Reads order status straight from a Google Sheet — no export step."
          >
            <div className="grid gap-4">
              <Checkbox
                label="Show order tracking on the site"
                checked={s.trackingEnabled}
                onChange={(e) => set('trackingEnabled', e.target.checked)}
              />

              <div>
                <span className="field-label">Google Sheet link</span>
                <Input
                  value={s.trackingSheetUrl}
                  onChange={(e) => set('trackingSheetUrl', e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  In Google Sheets: Share → General access → <b>Anyone with the link → Viewer</b>,
                  then paste the address here.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="field-label">Tab name</span>
                  <Input
                    value={s.trackingSheetTab}
                    onChange={(e) => set('trackingSheetTab', e.target.value)}
                    placeholder="Leave blank for the first tab"
                  />
                </div>
                <div>
                  <span className="field-label">Refresh every (minutes)</span>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={s.trackingCacheMinutes}
                    onChange={(e) => set('trackingCacheMinutes', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Button variant="outline" onClick={testSheet} disabled={testing}>
                  {testing ? 'Checking the sheet…' : 'Test connection'}
                </Button>

                {test && (
                  <div
                    className={
                      'mt-3 border p-4 text-[13px] ' +
                      (test.ok
                        ? 'border-[#BFE3CC] bg-[#E4F4EA] text-[#1F6B41]'
                        : 'border-[#F3C6C8] bg-[#FBE7E8] text-[#C42027]')
                    }
                  >
                    {test.ok ? (
                      <>
                        <b>Connected.</b> Found {test.orders} orders.
                        <div className="mt-1.5">
                          Stages: {(test.stages ?? []).join(' → ') || 'none detected'}
                        </div>
                        {test.sample && <div className="mt-1">First order: {test.sample}</div>}
                      </>
                    ) : (
                      <>
                        <b>{test.error}</b>
                        {test.hint && <div className="mt-1.5">{test.hint}</div>}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <span className="field-label">Heading</span>
                <Input
                  value={s.trackingHeading}
                  onChange={(e) => set('trackingHeading', e.target.value)}
                />
              </div>
              <div>
                <span className="field-label">Intro</span>
                <Textarea
                  rows={2}
                  value={s.trackingIntro}
                  onChange={(e) => set('trackingIntro', e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="field-label">Input placeholder</span>
                  <Input
                    value={s.trackingPlaceholder}
                    onChange={(e) => set('trackingPlaceholder', e.target.value)}
                  />
                </div>
                <div>
                  <span className="field-label">Help line</span>
                  <Input
                    value={s.trackingHelp}
                    onChange={(e) => set('trackingHelp', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <span className="field-label">Message when an order is not found</span>
                <Textarea
                  rows={2}
                  value={s.trackingNotFound}
                  onChange={(e) => set('trackingNotFound', e.target.value)}
                />
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
