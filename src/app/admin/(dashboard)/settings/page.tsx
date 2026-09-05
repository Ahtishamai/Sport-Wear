import { getSettings } from '@/lib/settings';
import { paypalSecretSummary } from '@/lib/payments';
import { mailConfigSummary } from '@/lib/mail';
import { SettingsEditor } from '@/components/admin/SettingsEditor';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, secret, mail] = await Promise.all([
    getSettings(),
    paypalSecretSummary(),
    mailConfigSummary(),
  ]);
  // Only whether a secret exists crosses to the browser — never its value.
  // The mail summary is the same shape minus the password.
  return <SettingsEditor settings={settings} paypalSecretSet={secret.set} mail={mail} />;
}
