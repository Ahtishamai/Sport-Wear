import { getSettings } from '@/lib/settings';
import { paypalSecretSummary } from '@/lib/payments';
import { mailConfigSummary } from '@/lib/mail';
import { googleConfigSummary } from '@/lib/google-reviews';
import { SettingsEditor } from '@/components/admin/SettingsEditor';
import { GoogleReviewsPanel } from '@/components/admin/GoogleReviewsPanel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, secret, mail, google] = await Promise.all([
    getSettings(),
    paypalSecretSummary(),
    mailConfigSummary(),
    googleConfigSummary(),
  ]);
  // Only whether a secret exists crosses to the browser — never its value.
  // The mail and Google summaries are the same shape minus the credentials.
  return (
    <>
      <SettingsEditor settings={settings} paypalSecretSet={secret.set} mail={mail} />
      <div className="mx-auto w-full max-w-[1240px] px-5 pb-10 md:px-8">
        <GoogleReviewsPanel initial={google} />
      </div>
    </>
  );
}
