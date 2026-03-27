'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAIChatStore } from '@/stores/ai-chat.store';
import { Check, Copy, Sparkles } from 'lucide-react';

const EXAMPLE_TEXT = `We're a team called 'HQ Staff'. Use GPS check-in at our office (lat 3.139, lng 101.687, 100m radius). Working hours Monday to Friday 8am to 5pm, lunch break 12pm to 1pm. Assign all employees.`;

const CHECKLIST = [
  'Check-in method (GPS phone location or physical device terminal)',
  'Office location (address/coordinates + radius) or device info',
  'Team/group name (e.g. "Office Staff")',
  'Working days and hours (e.g. "Mon–Fri 8am–5pm")',
  'Whether to assign all employees or specific ones',
];

interface AISetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
}

export function AISetupDialog({ open, onOpenChange, sid }: AISetupDialogProps) {
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const { setPendingPrompt, setOpen: setChatOpen, setOverrideSid } = useAIChatStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(EXAMPLE_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    const prompt = `Set up the attendance system for this branch (sid: ${sid}). Here's what I need:\n\n${description.trim()}\n\nCheck what's already configured, then create everything that's missing step by step. If my description is missing important details (like exact coordinates, working hours, or group name), ask me before proceeding.`;

    setOverrideSid(sid);
    setPendingPrompt(prompt);
    setChatOpen(true);
    onOpenChange(false);
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-primary-foreground">
                AI-Powered Setup
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/80 text-sm">
                Describe what you need — the AI does the rest
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Guide checklist */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Tell the AI about:
            </p>
            <ul className="space-y-1.5">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Example box */}
          <div className="relative rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary mb-1">
              Example
            </p>
            <p className="text-sm text-muted-foreground italic pr-8">
              &ldquo;{EXAMPLE_TEXT}&rdquo;
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Textarea */}
          <Textarea
            placeholder="Describe your attendance setup..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px]"
          />

          {/* Submit */}
          <Button
            className="w-full bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-md hover:shadow-lg hover:opacity-90 transition-all"
            size="lg"
            onClick={handleSubmit}
            disabled={!description.trim()}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Let AI set it up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
