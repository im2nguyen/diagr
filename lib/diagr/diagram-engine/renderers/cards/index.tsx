'use client';

import type { ComponentType } from 'react';
import * as Phosphor from '@phosphor-icons/react/dist/ssr';
import type { DiagrNodeRenderer } from '@/lib/diagr/diagram-engine/registry';
import styles from './index.module.css';

type CardItem = {
  label: string;
  tone?: string;
  icons?: number;
  icon?: string;
  iconSize?: number;
};

function readCards(data?: Record<string, unknown>): CardItem[] {
  const list = data?.cards;
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter((value): value is Record<string, unknown> => typeof value === 'object' && value !== null)
    .map((value) => ({
      label: typeof value.label === 'string' ? value.label : '',
      tone: typeof value.tone === 'string' ? value.tone : 'dodgerblue',
      icons: typeof value.icons === 'number' ? value.icons : 1,
      icon: typeof value.icon === 'string' ? value.icon : 'user-circle',
      iconSize: typeof value.iconSize === 'number' ? value.iconSize : undefined,
    }));
}

function normalizeIconName(value?: string): string {
  return (value ?? 'user-circle')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

const phosphorRegistry = Phosphor as unknown as Record<string, unknown>;
const iconCache = new Map<string, ComponentType<Record<string, unknown>>>();

function toPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function resolvePhosphorIcon(name?: string): ComponentType<Record<string, unknown>> {
  const normalized = normalizeIconName(name);
  const cached = iconCache.get(normalized);
  if (cached) {
    return cached;
  }

  const pascal = toPascalCase(normalized);
  const candidates = [
    pascal,
    `${pascal}Icon`,
    pascal === 'Db' ? 'Database' : '',
    pascal === 'Users' ? 'UsersThree' : '',
    pascal === 'Settings' ? 'Gear' : '',
  ].filter(Boolean);

  for (const key of candidates) {
    const component = phosphorRegistry[key];
    if (typeof component === 'function' || (typeof component === 'object' && component !== null)) {
      const typed = component as ComponentType<Record<string, unknown>>;
      iconCache.set(normalized, typed);
      return typed;
    }
  }

  const fallback = phosphorRegistry.UserCircle as ComponentType<Record<string, unknown>>;
  iconCache.set(normalized, fallback);
  return fallback;
}

function clampIconSize(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 19;
  }
  return Math.max(12, Math.min(48, value));
}

function CardGlyph({ name, size }: { name?: string; size?: number }) {
  const Icon = resolvePhosphorIcon(name);
  return <Icon size={clampIconSize(size)} weight="regular" aria-hidden="true" />;
}

export const CardsRenderer: DiagrNodeRenderer = ({ label, data }) => {
  const cards = readCards(data);
  const displayLabel = typeof label === 'string' ? label : '';
  const hasVariantLabel = displayLabel.trim().length > 0;

  return (
    <div className={`diagr-node-content ${styles.shell}`}>
      {hasVariantLabel ? <div className="diagr-node-title">{displayLabel}</div> : null}
      <div className={styles.grid}>
        {cards.length === 0 ? (
          <div
            className={styles.card}
            style={{
              ['--card-accent' as string]: 'dodgerblue',
              ['--card-bg' as string]: 'color-mix(in srgb, white 78%, dodgerblue 22%)',
              ['--card-icon-size' as string]: '19px',
            }}
          >
            <div className={styles.icons}>
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={`default-${i}`} className={styles.icon}>
                  <CardGlyph name="user-circle" size={19} />
                </span>
              ))}
            </div>
            <div className={styles.label}>Directory group</div>
          </div>
        ) : (
          cards.map((card, index) => {
            const iconCount = card.icons ?? 12;
            const variantClass = iconCount <= 1 ? styles.cardCompact : iconCount <= 4 ? styles.cardMedium : '';

            return (
              <div
                key={`${card.label}-${index}`}
                className={`${styles.card} ${variantClass}`.trim()}
                style={{
                  ['--card-accent' as string]: card.tone ?? 'dodgerblue',
                  ['--card-bg' as string]: `color-mix(in srgb, white 78%, ${card.tone ?? 'dodgerblue'} 22%)`,
                  ['--card-icon-size' as string]: `${clampIconSize(card.iconSize)}px`,
                }}
              >
                <div className={styles.icons}>
                  {Array.from({ length: iconCount }).map((_, i) => (
                    <span key={`${card.label}-${i}`} className={styles.icon}>
                      <CardGlyph name={card.icon} size={card.iconSize} />
                    </span>
                  ))}
                </div>
                <div className={styles.label}>{card.label}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
