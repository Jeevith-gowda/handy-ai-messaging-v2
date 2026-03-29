import { redirect } from 'next/navigation';

export default function HandymanJobLegacyRedirectPage({ params }) {
  redirect(`/handyman/projects/${params.id}`);
}
