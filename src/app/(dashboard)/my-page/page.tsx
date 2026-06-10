'use client';

/**
 * My Page — the employee view's only page. Employees land here when
 * entering from the hub (the role-aware SSO landing — lib/role.ts
 * `roleHome('employee')`).
 *
 * TEMPLATE: this is a placeholder. When forking, replace it with the
 * module's own-data page (attendance has My Attendance at /profile, salary
 * has My Payroll at /my-payroll, leave /leave, claim /claim) and update the
 * route name + `roleHome` + the `myPage` nav entry to match.
 */

import { UserCircle, Info } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/i18n';

export default function MyPagePage() {
  const { t: tNav } = useTranslation('navigation');
  const { t: tCommon } = useTranslation('common');

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCircle}
        accent="primary"
        title={tNav('myPage')}
        subtitle={tCommon('myPageSubtitle')}
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              {tCommon('myPagePlaceholder')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
