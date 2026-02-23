import { createContext } from 'react';
import type { UserTeamInfo, TeamRole } from '../services/coaching/types';

/** Teams grouped by organization for the switcher UI */
export interface OrgTeamGroup {
  org_id: string | null;
  org_name: string;
  teams: UserTeamInfo[];
}

export interface CoachingContextType {
  userId: string;
  teamId: string;
  teamName: string;
  teamRole: TeamRole | null;
  orgId: string | null;
  activeTeam: UserTeamInfo | null;
  teams: UserTeamInfo[];
  teamsByOrg: OrgTeamGroup[];
  isLoadingTeam: boolean;
  teamError: string | null;
  hasTeam: boolean | null;
  switchTeam: (newTeamId: string) => void;
  refreshTeam: () => Promise<void>;
}

export const CoachingContext = createContext<CoachingContextType | null>(null);
