'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import { Loader2, Mail, Send } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { adminSettingsService } from '@/services/admin-settings.service';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Notification settings
  const [emailNotif, setEmailNotif] = useState(true);
  const [lateAlert, setLateAlert] = useState(true);
  const [absentAlert, setAbsentAlert] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  const userData = useAuthStore((s) => s.userData);
  const { selectedSid } = useBranchSelector();

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      toast.success('Notification settings updated');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!userData?.user_email) {
      toast.error('No email address found. Please check your profile.');
      return;
    }
    if (!selectedSid || selectedSid === 'all') {
      toast.error('Please select a branch first.');
      return;
    }

    setSendingEmail(true);
    try {
      const result = await adminSettingsService.sendWeeklyReportEmail({
        sid: selectedSid,
        to_email: userData.user_email,
        to_name: userData.user_name || 'Admin',
      });
      if (result.success) {
        toast.success(`Weekly report sent to ${userData.user_email}`);
      } else {
        toast.error(result.message || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send weekly report email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your notification preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Configure how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Late Arrival Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified when staff arrive late</p>
            </div>
            <Switch checked={lateAlert} onCheckedChange={setLateAlert} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Absent Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified about absent staff</p>
            </div>
            <Switch checked={absentAlert} onCheckedChange={setAbsentAlert} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Report</p>
              <p className="text-sm text-muted-foreground">Receive weekly attendance summary</p>
            </div>
            <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Weekly Email Report
          </CardTitle>
          <CardDescription>
            Send a test weekly attendance report to your email ({userData?.user_email || 'not set'}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will generate a weekly attendance summary for the selected branch
            and send it to your email address. Use this to preview the report format.
          </p>
          <Button
            onClick={handleSendTestEmail}
            disabled={sendingEmail}
            variant="outline"
          >
            {sendingEmail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {sendingEmail ? 'Sending...' : 'Send Test Email'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
