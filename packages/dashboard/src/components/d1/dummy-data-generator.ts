/**
 * Dummy Data Generator for D1 Tables
 *
 * Generates realistic fake data based on column types using Faker.js.
 * Supports all SQLite/D1 type affinities and foreign key constraints.
 */

import { faker } from '@faker-js/faker'
import type { D1Column, D1TableSchema, D1CellValue, D1ForeignKey } from './types'

/**
 * Map of column name -> available foreign key values
 */
export type ForeignKeyValues = Record<string, D1CellValue[]>

/**
 * Common column name patterns for date/time detection
 */
const DATE_TIME_PATTERNS = [
  /^(created|updated|deleted|modified|published|expires?)_?at$/i,
  /^(created|updated|deleted|modified|published)_?(date|time|on)$/i,
  /^(start|end|begin|finish|due|birth|event)_?(date|time|at)?$/i,
  /^date_?(of|created|updated|time)?$/i,
  /^timestamp$/i,
  /^.*_timestamp$/i,
]

const DATE_ONLY_PATTERNS = [
  /^(birth|event|start|end|due)_?date$/i,
  /^date$/i,
  /^.*_date$/i,
]

const TIME_ONLY_PATTERNS = [
  /^(start|end)_?time$/i,
  /^time$/i,
]

/**
 * Check if column name matches date/time patterns
 */
function matchesDateTimePattern(name: string): 'datetime' | 'date' | 'time' | null {
  const lowerName = name.toLowerCase()

  // Check time-only patterns first (more specific)
  for (const pattern of TIME_ONLY_PATTERNS) {
    if (pattern.test(lowerName)) return 'time'
  }

  // Check date-only patterns
  for (const pattern of DATE_ONLY_PATTERNS) {
    if (pattern.test(lowerName)) return 'date'
  }

  // Check datetime patterns (includes *_at columns)
  for (const pattern of DATE_TIME_PATTERNS) {
    if (pattern.test(lowerName)) return 'datetime'
  }

  return null
}

/**
 * Generate a value for a single column based on its type and name
 */
export function generateValueForColumn(column: D1Column): D1CellValue | undefined {
  // Skip auto-increment INTEGER primary keys - let SQLite generate
  if (column.pk === 1 && column.type.toUpperCase() === 'INTEGER') {
    return undefined
  }

  const type = column.type.toUpperCase()

  // Date/Time types (SQLite stores as TEXT)
  if (type.includes('DATETIME') || type.includes('TIMESTAMP')) {
    return faker.date.past().toISOString()
  }
  if (type === 'DATE') {
    return faker.date.past().toISOString().split('T')[0]
  }
  if (type === 'TIME') {
    return faker.date.past().toTimeString().split(' ')[0]
  }

  // Integer types (INT, INTEGER, TINYINT, SMALLINT, MEDIUMINT, BIGINT, INT2, INT8)
  if (type.includes('INT')) {
    return faker.number.int({ min: 1, max: 1000 })
  }

  // Real/Float types (REAL, DOUBLE, DOUBLE PRECISION, FLOAT)
  if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) {
    return faker.number.float({ min: 0, max: 100, fractionDigits: 2 })
  }

  // Boolean (BOOLEAN, BOOL) - stored as 0/1 in SQLite
  if (type.includes('BOOL')) {
    return faker.datatype.boolean() ? 1 : 0
  }

  // Numeric/Decimal types
  if (type.includes('NUMERIC') || type.includes('DECIMAL')) {
    return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 })
  }

  // Blob - can't meaningfully generate, return null
  if (type.includes('BLOB')) {
    return null
  }

  // For TEXT type, check column name patterns for date/time
  const dateTimeMatch = matchesDateTimePattern(column.name)
  if (dateTimeMatch === 'datetime') {
    return faker.date.past().toISOString()
  }
  if (dateTimeMatch === 'date') {
    return faker.date.past().toISOString().split('T')[0]
  }
  if (dateTimeMatch === 'time') {
    return faker.date.past().toTimeString().split(' ')[0]
  }

  // Default: TEXT (VARCHAR, CHAR, TEXT, CLOB, NCHAR, NVARCHAR, etc.)
  return faker.lorem.words({ min: 2, max: 5 })
}

/**
 * Generate a complete row of dummy data for a table
 * @param schema - Table schema
 * @param foreignKeyValues - Map of column name -> available FK values to pick from
 */
export function generateDummyRow(
  schema: D1TableSchema,
  foreignKeyValues?: ForeignKeyValues
): Record<string, D1CellValue> {
  const row: Record<string, D1CellValue> = {}

  for (const col of schema.columns) {
    // Check if this column has foreign key values to use
    if (foreignKeyValues && foreignKeyValues[col.name]?.length > 0) {
      // Pick a random existing value from the referenced table
      const fkValues = foreignKeyValues[col.name]
      row[col.name] = fkValues[Math.floor(Math.random() * fkValues.length)]
      continue
    }

    const value = generateValueForColumn(col)
    // Only include if value is not undefined (undefined means skip, like auto-increment PKs)
    if (value !== undefined) {
      row[col.name] = value
    }
  }

  return row
}

/**
 * Generate multiple rows of dummy data
 */
export function generateDummyRows(
  schema: D1TableSchema,
  count: number,
  foreignKeyValues?: ForeignKeyValues
): Record<string, D1CellValue>[] {
  const rows: Record<string, D1CellValue>[] = []

  for (let i = 0; i < count; i++) {
    rows.push(generateDummyRow(schema, foreignKeyValues))
  }

  return rows
}

/**
 * Get foreign key columns that need values fetched
 */
export function getForeignKeyColumns(schema: D1TableSchema): D1ForeignKey[] {
  return schema.foreignKeys || []
}

/**
 * Get a human-readable description of what will be generated for a column
 * @param column - Column info
 * @param foreignKeys - Optional foreign key info to check if column is FK
 */
export function getColumnGeneratorDescription(
  column: D1Column,
  foreignKeys?: D1ForeignKey[]
): string {
  if (column.pk === 1 && column.type.toUpperCase() === 'INTEGER') {
    return 'Auto-generated (skip)'
  }

  // Check if this column is a foreign key
  const fk = foreignKeys?.find(f => f.from === column.name)
  if (fk) {
    return `FK → ${fk.table}.${fk.to}`
  }

  const type = column.type.toUpperCase()

  if (type.includes('DATETIME') || type.includes('TIMESTAMP')) {
    return 'Random ISO datetime'
  }
  if (type === 'DATE') {
    return 'Random date (YYYY-MM-DD)'
  }
  if (type === 'TIME') {
    return 'Random time (HH:MM:SS)'
  }
  if (type.includes('INT')) {
    return 'Random integer (1-1000)'
  }
  if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) {
    return 'Random decimal (0-100)'
  }
  if (type.includes('BOOL')) {
    return 'Random boolean (0/1)'
  }
  if (type.includes('NUMERIC') || type.includes('DECIMAL')) {
    return 'Random decimal (0-1000)'
  }
  if (type.includes('BLOB')) {
    return 'null (skip)'
  }

  // For TEXT type, check column name patterns for date/time
  const dateTimeMatch = matchesDateTimePattern(column.name)
  if (dateTimeMatch === 'datetime') {
    return 'Random ISO datetime (by name)'
  }
  if (dateTimeMatch === 'date') {
    return 'Random date (by name)'
  }
  if (dateTimeMatch === 'time') {
    return 'Random time (by name)'
  }

  return 'Random words'
}
