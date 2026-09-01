import { getSettings } from '@/lib/settings';
import { paypalSecretSummary } from '@/lib/payments';
import { SettingsEditor } from '@/components/admin/SettingsEditor';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, secret] = await Promise.all([getSettings(), paypalSecretSummary()]);
  // Only whether a secret exists crosses to the browser — never its value.
  return <SettingsEditor settings={settings} paypalSecretSet={secret.set} />;
}
