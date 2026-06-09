import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { addGoal, updateGoal, deleteGoal, subscribeToGoals } from '../../services/firestore';
import { createGoalCalendarEvent, deleteCalendarEvent } from '../../services/calendar';
import { GOAL_TEMPLATES } from '../../constants/emissionFactors';
import { Card, Button, Badge, SectionHeader, EmptyState, ScoreRing, FormField, Input, Select } from '../shared';
import type { Goal, CategoryType } from '../../types';
import { format, differenceInDays, isPast } from 'date-fns';
import confetti from 'canvas-confetti';

function getDate(d: any): Date {
  return d instanceof Date ? d : d?.toDate?.() ?? new Date();
}

export function GoalsPage() {
  const { user, accessToken, goals, setGoals, addNotification } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToGoals(user.uid, setGoals);
    return unsub;
  }, [user?.uid]);

  const handleAddTemplateGoal = async (templateId: string) => {
    if (!user) return;
    const template = GOAL_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setCreating(true);
    try {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 3);
      await addGoal(user.uid, {
        title: template.title,
        description: template.description,
        category: template.category,
        targetReduction: template.targetReduction,
        currentReduction: 0,
        deadline,
        calendarEventId: null,
        status: 'active',
        milestones: [],
        createdAt: new Date(),
        templateId: template.id,
      });
      addNotification({ type: 'success', message: `Goal added: "${template.title}"` });
    } catch {
      addNotification({ type: 'error', message: 'Failed to add goal.' });
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteGoal = async (goal: Goal) => {
    if (!user || !goal.id) return;
    await updateGoal(user.uid, goal.id, { status: 'completed' });
    // Confetti celebration!
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#40916C', '#74C69D', '#D8F3DC'] });
    addNotification({ type: 'success', message: `🎉 Congratulations! Goal completed: "${goal.title}"` });
  };

  const handleAddCalendarEvent = async (goal: Goal) => {
    if (!goal.id || !user || !accessToken) {
      addNotification({ type: 'info', message: 'Please reconnect your Google account to add calendar reminders.' });
      return;
    }
    try {
      const eventId = await createGoalCalendarEvent(goal, accessToken);
      await updateGoal(user.uid, goal.id, { calendarEventId: eventId });
      addNotification({ type: 'success', message: '📅 Reminder added to Google Calendar!' });
    } catch {
      addNotification({ type: 'error', message: 'Failed to add calendar reminder. Check your Calendar permissions.' });
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    if (!user || !goal.id) return;
    if (goal.calendarEventId && accessToken) {
      try { await deleteCalendarEvent(goal.calendarEventId, accessToken); } catch { /* Ignore calendar deletion failures on cleanup */ }
    }
    await deleteGoal(user.uid, goal.id);
    addNotification({ type: 'info', message: 'Goal removed.' });
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-eco-ink">Goals 🎯</h1>
          <p className="text-eco-slate text-sm mt-1">Set and track your carbon reduction goals.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>+ Custom goal</Button>
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 ? (
        <div>
          <SectionHeader title="Active goals" subtitle={`${activeGoals.length} in progress`} />
          <div className="grid gap-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onComplete={handleCompleteGoal}
                onAddCalendar={handleAddCalendarEvent}
                onDelete={handleDeleteGoal}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="🎯"
          title="No active goals"
          description="Choose from templates or create a custom goal to start reducing your footprint."
        />
      )}

      {/* Goal templates */}
      <div>
        <SectionHeader title="Goal templates" subtitle="Quick-start proven eco-actions" />
        <div className="grid sm:grid-cols-2 gap-3">
          {GOAL_TEMPLATES.map((template) => {
            const alreadyAdded = goals.some((g) => g.templateId === template.id && g.status === 'active');
            return (
              <Card key={template.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-eco-mist rounded-xl flex items-center justify-center text-xl shrink-0">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-eco-ink">{template.title}</p>
                    <p className="text-xs text-eco-slate mt-0.5">{template.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="green" size="sm">−{template.targetReduction} kg/mo</Badge>
                      <Badge variant={template.effort === 'low' ? 'green' : template.effort === 'medium' ? 'amber' : 'red'} size="sm">
                        {template.effort} effort
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={alreadyAdded ? 'ghost' : 'outline'}
                    disabled={alreadyAdded || creating}
                    onClick={() => handleAddTemplateGoal(template.id)}
                    aria-label={`Add goal: ${template.title}`}
                  >
                    {alreadyAdded ? '✓ Added' : '+ Add'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <SectionHeader title="Completed goals 🏆" subtitle={`${completedGoals.length} achieved`} />
          <div className="grid gap-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="p-4 opacity-75">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-eco-mint/20 rounded-xl flex items-center justify-center text-eco-leaf">✓</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-eco-ink">{goal.title}</p>
                    <p className="text-xs text-eco-slate">Completed</p>
                  </div>
                  <Badge variant="green">Done!</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateGoalModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onComplete, onAddCalendar, onDelete }: {
  goal: Goal;
  onComplete: (g: Goal) => void;
  onAddCalendar: (g: Goal) => void;
  onDelete: (g: Goal) => void;
}) {
  const deadline = getDate(goal.deadline);
  const daysLeft = differenceInDays(deadline, new Date());
  const progress = Math.min((goal.currentReduction / goal.targetReduction) * 100, 100);
  const isOverdue = isPast(deadline);

  const CATEGORY_ICONS: Record<string, string> = {
    transport: '🚗', energy: '🏠', food: '🍔', shopping: '🛍️', travel: '✈️',
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        {/* Progress ring */}
        <ScoreRing
          value={progress}
          color="#40916C"
          size={64}
          strokeWidth={7}
          label={`${Math.round(progress)}%`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span aria-hidden="true">{CATEGORY_ICONS[goal.category]}</span>
                <p className="font-semibold text-eco-ink text-sm">{goal.title}</p>
              </div>
              <p className="text-xs text-eco-slate">{goal.description}</p>
            </div>
            <Badge variant={isOverdue ? 'red' : daysLeft <= 14 ? 'amber' : 'green'} size="sm">
              {isOverdue ? 'Overdue' : `${daysLeft}d left`}
            </Badge>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-xs text-eco-slate mb-1">
              <span>Progress: {goal.currentReduction.toFixed(1)} / {goal.targetReduction} kg CO₂e</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-eco-mist rounded-full overflow-hidden">
              <div className="h-full bg-eco-leaf rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => onComplete(goal)}>
              ✓ Mark complete
            </Button>
            {!goal.calendarEventId ? (
              <Button size="sm" variant="ghost" onClick={() => onAddCalendar(goal)}>
                📅 Add reminder
              </Button>
            ) : (
              <Badge variant="green" size="sm">📅 Reminder set</Badge>
            )}
            <button
              onClick={() => onDelete(goal)}
              className="text-xs text-eco-slate hover:text-red-500 transition-colors ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
              aria-label={`Delete goal: ${goal.title}`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Create Goal Modal ────────────────────────────────────────────────────────

function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const { user, addNotification } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('transport');
  const [targetReduction, setTargetReduction] = useState(30);
  const [deadlineMonths, setDeadlineMonths] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + deadlineMonths);
    try {
      await addGoal(user.uid, {
        title, description, category,
        targetReduction, currentReduction: 0,
        deadline, calendarEventId: null,
        status: 'active', milestones: [], createdAt: new Date(),
      });
      addNotification({ type: 'success', message: `Goal created: "${title}"` });
      onClose();
    } catch {
      addNotification({ type: 'error', message: 'Failed to create goal.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label="Create custom goal">
      <Card className="w-full max-w-md p-6" elevated>
        <SectionHeader title="Create custom goal" action={
          <button onClick={onClose} className="text-eco-slate hover:text-eco-ink" aria-label="Close">✕</button>
        } />
        <div className="space-y-4">
          <FormField label="Goal title" htmlFor="goal-title" required>
            <Input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cycle to work twice a week" />
          </FormField>
          <FormField label="Description" htmlFor="goal-desc">
            <Input id="goal-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details…" />
          </FormField>
          <FormField label="Category" htmlFor="goal-cat">
            <Select id="goal-cat" value={category} onChange={(e) => setCategory(e.target.value as CategoryType)}
              options={[
                { value: 'transport', label: '🚗 Transport' },
                { value: 'energy', label: '🏠 Home Energy' },
                { value: 'food', label: '🍔 Food' },
                { value: 'shopping', label: '🛍️ Shopping' },
                { value: 'travel', label: '✈️ Travel' },
              ]} />
          </FormField>
          <FormField label={`Monthly CO₂ reduction target: ${targetReduction} kg`} htmlFor="goal-target">
            <input id="goal-target" type="range" min={1} max={500} value={targetReduction} onChange={(e) => setTargetReduction(Number(e.target.value))} className="w-full" />
          </FormField>
          <FormField label="Deadline" htmlFor="goal-deadline">
            <Select id="goal-deadline" value={String(deadlineMonths)} onChange={(e) => setDeadlineMonths(Number(e.target.value))}
              options={[{ value: '1', label: '1 month' }, { value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '1 year' }]} />
          </FormField>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button disabled={!title.trim()} loading={saving} onClick={handleSave} className="flex-1">Save goal</Button>
        </div>
      </Card>
    </div>
  );
}
