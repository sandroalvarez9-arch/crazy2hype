import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatSkillLevel, getSkillLevelBadgeVariant, SkillLevel } from '@/utils/skillLevels';
import { Users, Mail, Phone, DollarSign } from 'lucide-react';
import PaymentInstructions from '@/components/PaymentInstructions';

interface Player {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  jerseyNumber?: string;
}

interface Step4Props {
  formData: {
    teamName: string;
    skillLevel: string;
    contactEmail: string;
    contactPhone: string;
  };
  players: Player[];
  entryFee?: number;
  paymentInfo?: {
    instructions?: string | null;
    venmo?: string | null;
    paypal?: string | null;
    bank?: string | null;
    cashapp?: string | null;
    other?: string | null;
  };
}

export function Step4Review({ formData, players, entryFee = 0, paymentInfo }: Step4Props) {
  const playersWithNames = players.filter((p) => p.name.trim());

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review & Payment</h3>
        <p className="text-sm text-muted-foreground">
          Review your registration details below
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Team Name</span>
              <span className="font-medium">{formData.teamName}</span>
            </div>
            {formData.skillLevel && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Skill Level</span>
                  <Badge variant={getSkillLevelBadgeVariant(formData.skillLevel as SkillLevel)}>
                    {formatSkillLevel(formData.skillLevel as SkillLevel)}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formData.contactEmail}</span>
              </div>
            )}
            {formData.contactPhone && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formData.contactPhone}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Players ({playersWithNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playersWithNames.map((player, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{player.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {player.position && <span>{player.position}</span>}
                    {player.jerseyNumber && <span>#{player.jerseyNumber}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {entryFee > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Entry Fee: ${entryFee}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentInstructions
                entryFee={entryFee}
                paymentInstructions={paymentInfo?.instructions}
                venmoUsername={paymentInfo?.venmo}
                paypalEmail={paymentInfo?.paypal}
                bankDetails={paymentInfo?.bank}
                cashappInfo={paymentInfo?.cashapp}
                otherPaymentMethods={paymentInfo?.other}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
