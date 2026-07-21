'use client';

import { ContactPageView } from '@web/features/contact/components/ContactPageView';

export default function PublicContactPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <ContactPageView backHref="/" backLabelKey="legal.backToHome" />
    </div>
  );
}
