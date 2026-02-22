import { describe, it, expect } from 'vitest'
import { generationOptionsSchema } from '../generation-options'

describe('generationOptionsSchema', () => {
  it('accepts options without model fields (backward compat)', () => {
    const result = generationOptionsSchema.parse({ ruleset: 'dnd5e', style: 'fantasy_art' })
    expect(result.textModel).toBeUndefined()
    expect(result.imageModel).toBeUndefined()
  })

  it('accepts options with textModel', () => {
    const result = generationOptionsSchema.parse({
      ruleset: 'dnd5e',
      style: 'fantasy_art',
      textModel: 'gpt-5.2',
    })
    expect(result.textModel).toBe('gpt-5.2')
  })

  it('accepts options with imageModel', () => {
    const result = generationOptionsSchema.parse({
      ruleset: 'dnd5e',
      style: 'fantasy_art',
      imageModel: 'gpt-image-1',
    })
    expect(result.imageModel).toBe('gpt-image-1')
  })

  it('accepts options with both model fields', () => {
    const result = generationOptionsSchema.parse({
      ruleset: 'dnd5e',
      style: 'fantasy_art',
      textModel: 'claude-sonnet-4-6',
      imageModel: 'gemini-2.5-flash-image',
    })
    expect(result.textModel).toBe('claude-sonnet-4-6')
    expect(result.imageModel).toBe('gemini-2.5-flash-image')
  })
})
