import { describe, it, expect } from 'vitest'
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  resolveTextProvider,
  resolveImageProvider,
  getDefaultTextModel,
  getDefaultImageModel,
  getAllTextModels,
  getAllImageModels,
  safeResolveTextProvider,
  safeResolveImageProvider,
} from '../models'

describe('models', () => {
  describe('TEXT_MODELS', () => {
    it('has openai, anthropic, and gemini providers', () => {
      expect(Object.keys(TEXT_MODELS)).toEqual(
        expect.arrayContaining(['openai', 'anthropic', 'gemini'])
      )
    })

    it('each model has id and label', () => {
      for (const models of Object.values(TEXT_MODELS)) {
        for (const model of models) {
          expect(model).toHaveProperty('id')
          expect(model).toHaveProperty('label')
        }
      }
    })

    it('has exactly one default per provider', () => {
      for (const models of Object.values(TEXT_MODELS)) {
        const defaults = models.filter((m) => m.default)
        expect(defaults).toHaveLength(1)
      }
    })
  })

  describe('IMAGE_MODELS', () => {
    it('has openai and gemini providers', () => {
      expect(Object.keys(IMAGE_MODELS)).toEqual(
        expect.arrayContaining(['openai', 'gemini'])
      )
    })

    it('has exactly one default per provider', () => {
      for (const models of Object.values(IMAGE_MODELS)) {
        const defaults = models.filter((m) => m.default)
        expect(defaults).toHaveLength(1)
      }
    })
  })

  describe('resolveTextProvider', () => {
    it('resolves openai models', () => {
      expect(resolveTextProvider('gpt-5.2')).toBe('openai')
    })

    it('resolves anthropic models', () => {
      expect(resolveTextProvider('claude-sonnet-4-6')).toBe('anthropic')
    })

    it('resolves gemini models', () => {
      expect(resolveTextProvider('gemini-2.5-flash')).toBe('gemini')
    })

    it('throws for unknown model', () => {
      expect(() => resolveTextProvider('unknown-model')).toThrow()
    })
  })

  describe('resolveImageProvider', () => {
    it('resolves openai models', () => {
      expect(resolveImageProvider('gpt-image-1')).toBe('openai')
    })

    it('resolves gemini models', () => {
      expect(resolveImageProvider('gemini-2.5-flash-image')).toBe('gemini')
    })

    it('throws for unknown model', () => {
      expect(() => resolveImageProvider('unknown-model')).toThrow()
    })
  })

  describe('getAllTextModels', () => {
    it('returns flat array of all text models', () => {
      const all = getAllTextModels()
      expect(all.length).toBeGreaterThan(0)
      expect(all.every((m) => m.id && m.label && m.provider)).toBe(true)
    })
  })

  describe('getAllImageModels', () => {
    it('returns flat array of all image models', () => {
      const all = getAllImageModels()
      expect(all.length).toBeGreaterThan(0)
      expect(all.every((m) => m.id && m.label && m.provider)).toBe(true)
    })
  })

  describe('getDefaultTextModel', () => {
    it('returns a valid model id', () => {
      const id = getDefaultTextModel()
      expect(resolveTextProvider(id)).toBeDefined()
    })
  })

  describe('getDefaultImageModel', () => {
    it('returns a valid model id', () => {
      const id = getDefaultImageModel()
      expect(resolveImageProvider(id)).toBeDefined()
    })
  })

  describe('safeResolveTextProvider', () => {
    it('resolves known model', () => {
      const result = safeResolveTextProvider('gpt-5.2')
      expect(result.provider).toBe('openai')
      expect(result.model).toBe('gpt-5.2')
    })

    it('falls back to default for unknown model', () => {
      const result = safeResolveTextProvider('removed-model')
      expect(result.model).toBe(getDefaultTextModel())
    })

    it('falls back to default for undefined', () => {
      const result = safeResolveTextProvider(undefined)
      expect(result.model).toBe(getDefaultTextModel())
    })
  })

  describe('safeResolveImageProvider', () => {
    it('resolves known model', () => {
      const result = safeResolveImageProvider('gpt-image-1')
      expect(result.provider).toBe('openai')
      expect(result.model).toBe('gpt-image-1')
    })

    it('falls back to default for unknown model', () => {
      const result = safeResolveImageProvider('removed-model')
      expect(result.model).toBe(getDefaultImageModel())
    })
  })
})
