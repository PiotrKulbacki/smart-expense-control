'use client';

import { useAppUser } from '@web/features/auth/components/AppUserProvider';
import { ContactPageView } from '@web/features/contact/components/ContactPageView';

export default function SettingsContactPage() {
  const user = useAppUser();

  return (
    <ContactPageView
      backHref="/settings"
      backLabelKey="contact.backToSettings"
      defaultName={user.name ?? ''}
      defaultEmail={user.email}
    />
  );
}
