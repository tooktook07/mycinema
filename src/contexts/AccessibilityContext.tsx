import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface AccessibilitySettings {
  // Text & Font
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  wordSpacing: number;
  dyslexiaFont: boolean;
  
  // Visual
  contrastMode: 'normal' | 'high' | 'very-high';
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  grayscale: boolean;
  hideImages: boolean;
  
  // Navigation
  cursorSize: 'normal' | 'large' | 'extra-large';
  highlightLinks: boolean;
  enhancedFocus: boolean;
  readingGuide: boolean;
  
  // Motion
  reduceMotion: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  applyProfile: (profileName: string) => void;
  hasNonDefaultSettings: boolean;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 100,
  letterSpacing: 0,
  lineHeight: 1.75,
  wordSpacing: 0,
  dyslexiaFont: false,
  contrastMode: 'normal',
  colorBlindMode: 'none',
  grayscale: false,
  hideImages: false,
  cursorSize: 'normal',
  highlightLinks: false,
  enhancedFocus: false,
  readingGuide: false,
  reduceMotion: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'cinematch-accessibility';

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  const hasNonDefaultSettings = JSON.stringify(settings) !== JSON.stringify(defaultSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applySettingsToDOM(settings);
  }, [settings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const applyProfile = (profileName: string) => {
    const profiles: Record<string, Partial<AccessibilitySettings>> = {
      visual: {
        fontSize: 140,
        lineHeight: 2.0,
        contrastMode: 'high',
        dyslexiaFont: true,
        enhancedFocus: true,
      },
      motor: {
        cursorSize: 'extra-large',
        enhancedFocus: true,
        reduceMotion: true,
        highlightLinks: true,
      },
      cognitive: {
        readingGuide: true,
        reduceMotion: true,
        hideImages: true,
        lineHeight: 2.2,
      },
      dyslexia: {
        dyslexiaFont: true,
        letterSpacing: 0.1,
        wordSpacing: 0.2,
        lineHeight: 2.0,
        readingGuide: true,
      },
    };

    if (profiles[profileName]) {
      setSettings((prev) => ({ ...prev, ...profiles[profileName] }));
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{ settings, updateSettings, resetSettings, applyProfile, hasNonDefaultSettings }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

function applySettingsToDOM(settings: AccessibilitySettings) {
  const root = document.documentElement;
  
  // Apply CSS variables
  root.style.setProperty('--a11y-font-size', `${settings.fontSize}%`);
  root.style.setProperty('--a11y-letter-spacing', `${settings.letterSpacing}em`);
  root.style.setProperty('--a11y-line-height', `${settings.lineHeight}`);
  root.style.setProperty('--a11y-word-spacing', `${settings.wordSpacing}em`);
  
  // Apply classes
  root.classList.toggle('dyslexia-font', settings.dyslexiaFont);
  root.classList.toggle('contrast-high', settings.contrastMode === 'high');
  root.classList.toggle('contrast-very-high', settings.contrastMode === 'very-high');
  root.classList.toggle('grayscale-mode', settings.grayscale);
  root.classList.toggle('hide-images', settings.hideImages);
  root.classList.toggle('cursor-large', settings.cursorSize === 'large');
  root.classList.toggle('cursor-extra-large', settings.cursorSize === 'extra-large');
  root.classList.toggle('highlight-links', settings.highlightLinks);
  root.classList.toggle('enhanced-focus', settings.enhancedFocus);
  root.classList.toggle('reduce-motion', settings.reduceMotion);
  
  // Colorblind modes
  root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
  if (settings.colorBlindMode !== 'none') {
    root.classList.add(`colorblind-${settings.colorBlindMode}`);
  }
}
