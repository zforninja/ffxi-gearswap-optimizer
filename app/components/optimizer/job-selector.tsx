'use client';
import { Swords, Users } from 'lucide-react';
import { JOBS, JOB_NAMES } from '@/lib/ffxi/constants';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function JobSelector({ mainJob, subJob, onMain, onSub }: { mainJob: string; subJob: string; onMain: (j: string) => void; onSub: (j: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><Swords className="h-3.5 w-3.5 text-primary" /> Main job</Label>
        <Select value={mainJob} onValueChange={(v: string) => onMain?.(v)}>
          <SelectTrigger className="bg-secondary/60"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {JOBS.map((j: string) => (
              <SelectItem key={j} value={j}><span className="font-mono font-semibold">{j}</span> <span className="text-muted-foreground ml-1 text-xs">{JOB_NAMES[j] ?? ''}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><Users className="h-3.5 w-3.5 text-primary" /> Sub job</Label>
        <Select value={subJob} onValueChange={(v: string) => onSub?.(v)}>
          <SelectTrigger className="bg-secondary/60"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {JOBS.filter((j: string) => j !== mainJob).map((j: string) => (
              <SelectItem key={j} value={j}><span className="font-mono font-semibold">{j}</span> <span className="text-muted-foreground ml-1 text-xs">{JOB_NAMES[j] ?? ''}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
