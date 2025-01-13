import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Agent } from '../lib/simulation/Agent';
import { format } from 'date-fns';

interface AgentDetailsProps {
  agent: Agent;
  onClose: () => void;
}

export default function AgentDetails({ agent, onClose }: AgentDetailsProps) {
  return (
    <Card className="fixed right-4 top-4 w-80 bg-background/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agent Details</CardTitle>
        <button onClick={onClose} className="text-muted-foreground hover:text-primary">
          ✕
        </button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">ID</h3>
              <p className="text-sm text-muted-foreground">{agent.id}</p>
            </div>

            <div>
              <h3 className="font-medium">Position</h3>
              <p className="text-sm text-muted-foreground">
                {agent.position.x.toFixed(2)}, {agent.position.y.toFixed(2)}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Status</h3>
              <Badge variant={
                agent.characteristics.status === 'active' ? 'default' :
                agent.characteristics.status === 'moving' ? 'secondary' : 'outline'
              }>
                {agent.characteristics.status}
              </Badge>
            </div>

            <div>
              <h3 className="font-medium mb-2">Energy</h3>
              <Progress value={agent.characteristics.energy} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(agent.characteristics.energy)}%
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Speed</h3>
              <Progress value={agent.characteristics.speed} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(agent.characteristics.speed)}%
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Influence</h3>
              <Progress value={agent.characteristics.influence} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(agent.characteristics.influence)}%
              </p>
            </div>

            <div>
              <h3 className="font-medium">Age</h3>
              <p className="text-sm text-muted-foreground">
                {Math.floor(agent.characteristics.age)} time units
              </p>
            </div>

            <div>
              <h3 className="font-medium">Last Updated</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(agent.characteristics.lastUpdated), 'HH:mm:ss')}
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}