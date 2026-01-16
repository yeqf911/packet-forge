import { createContext, useContext, useState, ReactNode } from 'react';

const FONT_SIZE_KEY = 'packetforge_font_size';
export const FONT_SIZE_LEVELS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24];

interface FontSizeContextType {
  fontSize: number;
  setFontSize: (value: number) => void;
}

export const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? parseInt(saved) : 14;
  });

  const handleSetFontSize = (value: number) => {
    setFontSize(value);
    localStorage.setItem(FONT_SIZE_KEY, value.toString());
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize: handleSetFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) throw new Error('useFontSize must be used within FontSizeProvider');
  return context;
};
