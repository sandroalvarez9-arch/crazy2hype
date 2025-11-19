import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Users } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  jerseyNumber: string;
}

interface Step3Props {
  players: Player[];
  onUpdatePlayer: (index: number, field: string, value: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (index: number) => void;
  minPlayers: number;
}

export function Step3AddPlayers({
  players,
  onUpdatePlayer,
  onAddPlayer,
  onRemovePlayer,
  minPlayers,
}: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Add Players</h3>
        <p className="text-sm text-muted-foreground">
          Player names are required. Other details are optional.
        </p>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {players.map((player, index) => (
          <Card key={player.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Player {index + 1}</span>
                </div>
                {players.length > minPlayers && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemovePlayer(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`player-name-${index}`}>
                    Name {index === 0 && '*'}
                  </Label>
                  <Input
                    id={`player-name-${index}`}
                    placeholder="Player name"
                    value={player.name}
                    onChange={(e) => onUpdatePlayer(index, 'name', e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`player-email-${index}`}>Email</Label>
                  <Input
                    id={`player-email-${index}`}
                    type="email"
                    placeholder="email@example.com"
                    value={player.email}
                    onChange={(e) => onUpdatePlayer(index, 'email', e.target.value)}
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`player-phone-${index}`}>Phone</Label>
                  <Input
                    id={`player-phone-${index}`}
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={player.phone}
                    onChange={(e) => onUpdatePlayer(index, 'phone', e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`player-position-${index}`}>Position</Label>
                  <Input
                    id={`player-position-${index}`}
                    placeholder="e.g., Outside Hitter"
                    value={player.position}
                    onChange={(e) => onUpdatePlayer(index, 'position', e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`player-jersey-${index}`}>Jersey #</Label>
                  <Input
                    id={`player-jersey-${index}`}
                    placeholder="e.g., 10"
                    value={player.jerseyNumber}
                    onChange={(e) => onUpdatePlayer(index, 'jerseyNumber', e.target.value)}
                    maxLength={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onAddPlayer}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Player
      </Button>
    </div>
  );
}
