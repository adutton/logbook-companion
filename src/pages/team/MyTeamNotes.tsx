import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getMyTeamMembership,
  getMySessionNotes,
} from '../../services/coaching/coachingService';
import type { Team } from '../../services/coaching/types';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { EmptyState } from '../../components/ui/EmptyState';

interface SessionNote {
  id: string;
  note: string;
  created_at: string;
  session_date?: string;
  session_type?: string;
}

export function MyTeamNotes() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    getMyTeamMembership(user.id)
      .then(async (membership) => {
        if (!membership) {
          setError('You are not on a team yet.');
          return;
        }
        setTeam(membership.team);
        try {
          const data = await getMySessionNotes(user.id, membership.team.id);
          setNotes(data || []);
        } catch {
          // Notes may not be available
          setNotes([]);
        }
      })
      .catch(() => setError('Failed to load team data.'))
      .finally(() => setIsLoading(false));
  }, [user]);

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
          { label: 'Notes' },
        ]} />

        <h1 className="text-2xl font-bold tracking-tight">My Notes</h1>
        {team && <p className="text-sm text-neutral-500">{team.name}</p>}

        {notes.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="No notes yet"
            description="Session notes from your coaches will appear here."
          />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-1"
              >
                {note.session_date && (
                  <div className="text-xs text-neutral-500">
                    {new Date(note.session_date).toLocaleDateString()}
                    {note.session_type && ` · ${note.session_type}`}
                  </div>
                )}
                <p className="text-sm text-neutral-200">{note.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
