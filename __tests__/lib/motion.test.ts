/**
 * Tests for src/lib/motion.ts
 *
 * Validates that all exported animation constants have correct types,
 * shapes, and values. These are the single source of truth for all
 * Tablix landing-page animations — a broken constant breaks every
 * animated component that imports it.
 */

import { TIMING, EASING, SPRING, variants } from '@/lib/motion'

// ---------------------------------------------------------------------------
// TIMING
// ---------------------------------------------------------------------------

describe('TIMING', () => {
  it('exports an object', () => {
    expect(typeof TIMING).toBe('object')
    expect(TIMING).not.toBeNull()
  })

  it('has all required keys', () => {
    expect(TIMING).toHaveProperty('fast')
    expect(TIMING).toHaveProperty('normal')
    expect(TIMING).toHaveProperty('slow')
    expect(TIMING).toHaveProperty('reveal')
    expect(TIMING).toHaveProperty('stagger')
  })

  it('fast is 0.15s', () => {
    expect(TIMING.fast).toBe(0.15)
  })

  it('normal is 0.25s', () => {
    expect(TIMING.normal).toBe(0.25)
  })

  it('slow is 0.4s', () => {
    expect(TIMING.slow).toBe(0.4)
  })

  it('reveal is 0.5s', () => {
    expect(TIMING.reveal).toBe(0.5)
  })

  it('stagger is 0.06s', () => {
    expect(TIMING.stagger).toBe(0.06)
  })

  it('all values are positive numbers', () => {
    Object.values(TIMING).forEach((value) => {
      expect(typeof value).toBe('number')
      expect(value).toBeGreaterThan(0)
    })
  })

  it('ordering: fast < normal < slow < reveal', () => {
    expect(TIMING.fast).toBeLessThan(TIMING.normal)
    expect(TIMING.normal).toBeLessThan(TIMING.slow)
    expect(TIMING.slow).toBeLessThan(TIMING.reveal)
  })
})

// ---------------------------------------------------------------------------
// EASING
// ---------------------------------------------------------------------------

describe('EASING', () => {
  it('exports an object', () => {
    expect(typeof EASING).toBe('object')
    expect(EASING).not.toBeNull()
  })

  it('has enter and exit keys', () => {
    expect(EASING).toHaveProperty('enter')
    expect(EASING).toHaveProperty('exit')
  })

  it('enter is a 4-element tuple of numbers', () => {
    expect(Array.isArray(EASING.enter)).toBe(true)
    expect(EASING.enter).toHaveLength(4)
    EASING.enter.forEach((v) => expect(typeof v).toBe('number'))
  })

  it('exit is a 4-element tuple of numbers', () => {
    expect(Array.isArray(EASING.exit)).toBe(true)
    expect(EASING.exit).toHaveLength(4)
    EASING.exit.forEach((v) => expect(typeof v).toBe('number'))
  })

  it('enter cubic-bezier values are in valid range [0, 1]', () => {
    EASING.enter.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    })
  })

  it('enter matches expected ease-out curve [0.25, 0.46, 0.45, 0.94]', () => {
    expect(EASING.enter).toEqual([0.25, 0.46, 0.45, 0.94])
  })

  it('exit matches expected ease-in curve [0.55, 0.06, 0.68, 0.19]', () => {
    expect(EASING.exit).toEqual([0.55, 0.06, 0.68, 0.19])
  })
})

// ---------------------------------------------------------------------------
// SPRING
// ---------------------------------------------------------------------------

describe('SPRING', () => {
  it('exports an object', () => {
    expect(typeof SPRING).toBe('object')
    expect(SPRING).not.toBeNull()
  })

  it('has button, gentle, and pop presets', () => {
    expect(SPRING).toHaveProperty('button')
    expect(SPRING).toHaveProperty('gentle')
    expect(SPRING).toHaveProperty('pop')
  })

  describe('button preset', () => {
    it('has type "spring"', () => {
      expect(SPRING.button.type).toBe('spring')
    })

    it('has stiffness 400', () => {
      expect(SPRING.button.stiffness).toBe(400)
    })

    it('has damping 30', () => {
      expect(SPRING.button.damping).toBe(30)
    })
  })

  describe('gentle preset', () => {
    it('has type "spring"', () => {
      expect(SPRING.gentle.type).toBe('spring')
    })

    it('has stiffness 300', () => {
      expect(SPRING.gentle.stiffness).toBe(300)
    })

    it('has damping 24', () => {
      expect(SPRING.gentle.damping).toBe(24)
    })
  })

  describe('pop preset', () => {
    it('has type "spring"', () => {
      expect(SPRING.pop.type).toBe('spring')
    })

    it('has stiffness 500', () => {
      expect(SPRING.pop.stiffness).toBe(500)
    })

    it('has damping 25', () => {
      expect(SPRING.pop.damping).toBe(25)
    })
  })

  it('pop is stiffer than gentle (higher stiffness)', () => {
    expect(SPRING.pop.stiffness).toBeGreaterThan(SPRING.gentle.stiffness)
  })

  it('button is stiffer than gentle', () => {
    expect(SPRING.button.stiffness).toBeGreaterThan(SPRING.gentle.stiffness)
  })
})

// ---------------------------------------------------------------------------
// variants
// ---------------------------------------------------------------------------

describe('variants', () => {
  it('exports an object', () => {
    expect(typeof variants).toBe('object')
    expect(variants).not.toBeNull()
  })

  it('has all required variant keys', () => {
    expect(variants).toHaveProperty('fadeIn')
    expect(variants).toHaveProperty('slideUp')
    expect(variants).toHaveProperty('blurDissolve')
    expect(variants).toHaveProperty('springPop')
    expect(variants).toHaveProperty('staggerContainer')
    expect(variants).toHaveProperty('wordReveal')
  })

  describe('fadeIn', () => {
    it('hidden state has opacity 0', () => {
      expect(variants.fadeIn.hidden).toEqual({ opacity: 0 })
    })

    it('visible state has opacity 1', () => {
      expect(variants.fadeIn.visible.opacity).toBe(1)
    })

    it('visible transition uses TIMING.normal duration', () => {
      expect(variants.fadeIn.visible.transition.duration).toBe(TIMING.normal)
    })
  })

  describe('slideUp', () => {
    it('hidden state starts off-screen and invisible', () => {
      expect(variants.slideUp.hidden).toEqual({ opacity: 0, y: 20 })
    })

    it('visible state is fully visible at y=0', () => {
      expect(variants.slideUp.visible.opacity).toBe(1)
      expect(variants.slideUp.visible.y).toBe(0)
    })

    it('visible transition uses TIMING.slow duration', () => {
      expect(variants.slideUp.visible.transition.duration).toBe(TIMING.slow)
    })
  })

  describe('blurDissolve', () => {
    it('hidden state has blur(8px)', () => {
      expect(variants.blurDissolve.hidden.filter).toBe('blur(8px)')
      expect(variants.blurDissolve.hidden.opacity).toBe(0)
    })

    it('visible state removes blur', () => {
      expect(variants.blurDissolve.visible.filter).toBe('blur(0px)')
      expect(variants.blurDissolve.visible.opacity).toBe(1)
    })
  })

  describe('springPop', () => {
    it('hidden state is scaled down and invisible', () => {
      expect(variants.springPop.hidden).toEqual({ opacity: 0, scale: 0.85 })
    })

    it('visible state is fully visible at full scale', () => {
      expect(variants.springPop.visible.opacity).toBe(1)
      expect(variants.springPop.visible.scale).toBe(1)
    })

    it('visible transition uses SPRING.pop', () => {
      expect(variants.springPop.visible.transition).toEqual(SPRING.pop)
    })
  })

  describe('staggerContainer', () => {
    it('is a function', () => {
      expect(typeof variants.staggerContainer).toBe('function')
    })

    it('returns variant object with hidden and visible states', () => {
      const result = variants.staggerContainer()
      expect(result).toHaveProperty('hidden')
      expect(result).toHaveProperty('visible')
    })

    it('defaults stagger to TIMING.stagger when called without argument', () => {
      const result = variants.staggerContainer()
      expect(result.visible.transition.staggerChildren).toBe(TIMING.stagger)
    })

    it('accepts custom stagger delay', () => {
      const result = variants.staggerContainer(0.1)
      expect(result.visible.transition.staggerChildren).toBe(0.1)
    })

    it('accepts zero as stagger delay', () => {
      const result = variants.staggerContainer(0)
      expect(result.visible.transition.staggerChildren).toBe(0)
    })

    it('hidden state is an empty object (no initial animation)', () => {
      const result = variants.staggerContainer()
      expect(result.hidden).toEqual({})
    })
  })

  describe('wordReveal', () => {
    it('hidden state clips text above viewport (y: 110%)', () => {
      expect(variants.wordReveal.hidden.y).toBe('110%')
      expect(variants.wordReveal.hidden.opacity).toBe(0)
    })

    it('visible state brings text into view', () => {
      expect(variants.wordReveal.visible.y).toBe('0%')
      expect(variants.wordReveal.visible.opacity).toBe(1)
    })

    it('visible transition uses TIMING.reveal duration', () => {
      expect(variants.wordReveal.visible.transition.duration).toBe(TIMING.reveal)
    })
  })
})
