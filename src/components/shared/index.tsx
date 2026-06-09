import React from 'react';
import { clsx } from 'clsx';

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary:
      'bg-eco-leaf text-white hover:bg-eco-forest focus-visible:ring-eco-leaf shadow-sm hover:shadow-md active:scale-[0.98]',
    secondary:
      'bg-eco-mist text-eco-forest hover:bg-eco-mint/30 focus-visible:ring-eco-mint',
    ghost:
      'text-eco-slate hover:bg-eco-mist hover:text-eco-ink focus-visible:ring-eco-mint',
    danger:
      'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500 shadow-sm',
    outline:
      'border-2 border-eco-leaf text-eco-leaf hover:bg-eco-mist focus-visible:ring-eco-leaf',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size={size === 'sm' ? 14 : 16} />
      ) : (
        iconPosition === 'left' && icon
      )}
      {children}
      {!loading && iconPosition === 'right' && icon}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  elevated?: boolean;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
}

export function Card({ children, className, glass, elevated, onClick, ...props }: CardProps) {
  const base = 'rounded-2xl bg-white border border-gray-100 transition-all duration-200';
  const shadow = elevated
    ? 'shadow-[0_8px_32px_rgba(27,67,50,0.12)]'
    : 'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06)]';
  const glassStyle = glass
    ? 'bg-white/70 backdrop-blur-md border-white/40'
    : '';
  const interactive = onClick ? 'cursor-pointer hover:shadow-[0_8px_32px_rgba(27,67,50,0.12)] hover:-translate-y-0.5' : '';

  return (
    <div
      className={clsx(base, shadow, glassStyle, interactive, className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'green', size = 'sm' }: BadgeProps) {
  const variants = {
    green: 'bg-eco-mist text-eco-forest',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    gray: 'bg-gray-100 text-eco-slate',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full font-medium', variants[variant], sizes[size])}>
      {children}
    </span>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

export function LoadingSpinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={clsx('animate-spin', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

interface ScoreRingProps {
  value: number; // 0-100 percentage
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  animate?: boolean;
}

export function ScoreRing({
  value,
  color,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  animate = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        role="img"
        aria-label={`Carbon score: ${Math.round(value)}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#D8F3DC"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animate ? 'stroke-dashoffset 1s ease-in-out' : 'none',
          }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && (
            <span className="font-display font-bold text-eco-ink leading-none" style={{ fontSize: size * 0.18 }}>
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-eco-slate leading-tight mt-0.5" style={{ fontSize: size * 0.11 }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, error, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-eco-ink">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && (
        <p className="text-xs text-eco-slate" id={`${htmlFor}-hint`}>{hint}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-600" role="alert" id={`${htmlFor}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export function Input({ error, icon, className, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-eco-slate pointer-events-none">
          {icon}
        </div>
      )}
      <input
        className={clsx(
          'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-eco-ink placeholder:text-eco-slate/60',
          'focus:outline-none focus:ring-2 focus:ring-eco-leaf focus:border-transparent',
          'transition-all duration-150',
          error ? 'border-red-400 bg-red-50' : 'border-gray-200',
          icon && 'pl-10',
          className
        )}
        {...props}
      />
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: Array<{ value: string; label: string }>;
}

export function Select({ error, options, className, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-eco-ink',
        'focus:outline-none focus:ring-2 focus:ring-eco-leaf focus:border-transparent',
        'transition-all duration-150 cursor-pointer',
        error ? 'border-red-400 bg-red-50' : 'border-gray-200',
        className
      )}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, id, description }: ToggleProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-leaf focus-visible:ring-offset-2',
          checked ? 'bg-eco-leaf' : 'bg-gray-200'
        )}
        aria-label={label}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md',
            'transform transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      <div>
        <label htmlFor={id} className="text-sm font-medium text-eco-ink cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-eco-slate mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  id: string;
  unit?: string;
}

export function Slider({ value, onChange, min, max, step = 1, label, id, unit }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="text-sm font-medium text-eco-ink">
          {label}
        </label>
        <span className="text-sm font-mono font-semibold text-eco-leaf">
          {value}{unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-eco-mist"
        style={{
          background: `linear-gradient(to right, #40916C ${percent}%, #D8F3DC ${percent}%)`,
        }}
        aria-label={`${label}: ${value}${unit ?? ''}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="flex justify-between text-xs text-eco-slate mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Notification Toast ───────────────────────────────────────────────────────

interface ToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose: () => void;
}

export function Toast({ type, message, onClose }: ToastProps) {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  const colors = {
    success: 'bg-eco-forest text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-eco-sky text-white',
    warning: 'bg-amber-500 text-white',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'flex items-center gap-3 rounded-xl px-4 py-3 shadow-elevated text-sm font-medium',
        'animate-slide-up min-w-64 max-w-sm',
        colors[type]
      )}
    >
      <span aria-hidden="true">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="opacity-75 hover:opacity-100 transition-opacity ml-2"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="font-display font-bold text-xl text-eco-ink mb-2">{title}</h3>
      <p className="text-eco-slate text-sm max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="font-display font-bold text-lg text-eco-ink">{title}</h2>
        {subtitle && <p className="text-eco-slate text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  subvalue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  color?: string;
}

export function MetricCard({ icon, label, value, subvalue, trend, trendLabel, color }: MetricCardProps) {
  const trendColors = { up: 'text-red-500', down: 'text-eco-leaf', stable: 'text-eco-slate' };
  const trendIcons = { up: '↑', down: '↓', stable: '→' };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: color ? `${color}20` : '#D8F3DC' }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-eco-slate font-medium uppercase tracking-wide">{label}</p>
          <p className="font-display font-bold text-xl text-eco-ink mt-0.5">{value}</p>
          {subvalue && <p className="text-xs text-eco-slate mt-0.5">{subvalue}</p>}
          {trend && trendLabel && (
            <p className={clsx('text-xs font-medium mt-1', trendColors[trend])}>
              {trendIcons[trend]} {trendLabel}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: string;
  label?: string;
  showPercent?: boolean;
  animated?: boolean;
}

export function ProgressBar({ value, max = 100, color = '#40916C', label, showPercent, animated }: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);

  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-eco-slate mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span className="font-mono">{Math.round(percent)}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-eco-mist rounded-full overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={clsx('h-full rounded-full', animated && 'transition-all duration-700 ease-out')}
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
