import { LandingPage, landingMetadata } from '../landing-page';

/** The ad landing page for Custom Pinstripe Uniforms. Its words are the CMS
 *  page "lp-custom-pinstripe-uniforms"; see lib/landing.ts. */
export const revalidate = 300;

const PATH = 'custom-pinstripe-uniforms';

export const generateMetadata = () => landingMetadata(PATH);

export default function Page() {
  return <LandingPage path={PATH} />;
}
