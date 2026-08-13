import type { ValueTransformer } from 'typeorm';

export const numericTransformer: ValueTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | null): number | null =>
    value === null || value === undefined ? null : Number.parseFloat(value),
};
