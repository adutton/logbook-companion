import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getMyTeamMembership,
  leaveTeam,
} from '../../services/coaching/coachingService';
import type { Team, TeamRole } from '../../services/coaching/types';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { toast } from 'sonner';

export function MyTeamSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<TeamRole>('member');
  const [memberId, setMemberId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    getMyTeamMembership(user.id)
      .then((membership) => {
        if (!membership) {
          setError('You are not on a team yet.');
          return;
        }
        setTeam(membership.team);
        setRole(membership.role as TeamRole);
        setMemberId(membership.memberId);
      })
      .catch(() => setError('Failed to load team data.'))
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleLeave = async () => {
    if (!memberId) return;
    setIsLeaving(true);
    try {
      await leaveTeam(memberId);
      toast.success('Left team successfully');
      navigate('/');
    } catch {
      toast.error('Failed to leave team');
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-neutral-300">{error}</p>
          <Link to="/team" className="text-indigo-400 hover:text-indigo-300 text-sm">
            ← Back to My Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <Breadcrumb items={[
          { label: 'My Team', to: '/team' },
          { label: 'Settings' },
        ]} />

        <h1 className="text-2xl font-bold tracking-tight">Team Settings</h1>

        {/* Team Info */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-300">Team</h2>
          <p className="text-lg text-white">{team?.name}</p>
          <p className="text-xs text-neutral-500">
            Your role: <span className="text-neutral-300 capitalize">{role}</span>
          </p>
        </div>

        {/* Leave Team */}
        <div className="bg-neutral-900/60 border border-red-900/30 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
          <p className="text-xs text-neutral-400">
            Leaving the team will remove your access to team data, scores, and assignments.
          </p>

          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-400 border border-red-800 rounded-lg hover:bg-red-900/30 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave Team
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-300">Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLeaving ? 'Leaving...' : 'Yes, leave team'}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
