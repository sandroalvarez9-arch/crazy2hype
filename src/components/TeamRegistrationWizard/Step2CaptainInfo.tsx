import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, User } from 'lucide-react';

interface Step2Props {
  formData: {
    contactEmail: string;
    contactPhone: string;
  };
  onChange: (field: string, value: string) => void;
  captainName?: string;
}

export function Step2CaptainInfo({ formData, onChange, captainName }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Captain Information</h3>
        <p className="text-sm text-muted-foreground">We'll use this to contact you about the tournament</p>
      </div>

      <div className="space-y-4">
        {captainName && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Captain</p>
              <p className="text-sm text-muted-foreground">{captainName}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="contactEmail">
            <Mail className="h-4 w-4 inline mr-1" />
            Email
          </Label>
          <Input
            id="contactEmail"
            type="email"
            placeholder="captain@example.com"
            value={formData.contactEmail}
            onChange={(e) => onChange('contactEmail', e.target.value)}
            maxLength={255}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone">
            <Phone className="h-4 w-4 inline mr-1" />
            Phone (optional)
          </Label>
          <Input
            id="contactPhone"
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.contactPhone}
            onChange={(e) => onChange('contactPhone', e.target.value)}
            maxLength={20}
          />
        </div>
      </div>
    </div>
  );
}
