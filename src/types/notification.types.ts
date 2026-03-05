export type NotificationType =
  | 'assignment_created'
  | 'assignment_reminder'
  | 'pr_achieved'
  | 'athlete_joined'
  | 'score_entered'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  created_at: string;
}
