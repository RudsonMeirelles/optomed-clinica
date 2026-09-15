import React, { useEffect, useCallback } from 'react';

export interface DPadHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void; // OK / Enter / Center Button
  onBack?: () => void;   // Back / Esc / Return
  onMenu?: () => void;   // Menu / ContextMenu / Hamburger Button
  onPlayPause?: () => void; // Play/Pause Button
  onAnyKey?: () => void;
}

/**
 * Hook para controle completo por D-Pad do controle remoto Amazon Fire TV Stick / Vega OS / Smart TV / Teclado
 */
export function useDPad(handlers: DPadHandlers, enabled: boolean = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    if (handlers.onAnyKey) {
      handlers.onAnyKey();
    }

    const key = e.key;
    const keyCode = e.keyCode || e.which;

    // Up (Key Up / 38 / Gamepad / FireTV)
    if (
      key === 'ArrowUp' || 
      key === 'Up' || 
      key === 'GamepadDPadUp' || 
      key === 'VolumeUp' ||
      keyCode === 38 || 
      keyCode === 19 ||
      keyCode === 29460
    ) {
      e.preventDefault();
      handlers.onUp?.();
      return;
    }

    // Down (Key Down / 40 / Gamepad / FireTV)
    if (
      key === 'ArrowDown' || 
      key === 'Down' || 
      key === 'GamepadDPadDown' || 
      key === 'VolumeDown' ||
      keyCode === 40 || 
      keyCode === 20 ||
      keyCode === 29461
    ) {
      e.preventDefault();
      handlers.onDown?.();
      return;
    }

    // Left (Key Left / 37 / Gamepad / FireTV / Rewind)
    if (
      key === 'ArrowLeft' || 
      key === 'Left' || 
      key === 'GamepadDPadLeft' || 
      key === 'MediaRewind' ||
      key === 'FastFwd' ||
      keyCode === 37 || 
      keyCode === 21 ||
      keyCode === 89
    ) {
      e.preventDefault();
      handlers.onLeft?.();
      return;
    }

    // Right (Key Right / 39 / Gamepad / FireTV / FastForward)
    if (
      key === 'ArrowRight' || 
      key === 'Right' || 
      key === 'GamepadDPadRight' || 
      key === 'MediaFastForward' ||
      keyCode === 39 || 
      keyCode === 22 ||
      keyCode === 90
    ) {
      e.preventDefault();
      handlers.onRight?.();
      return;
    }

    // Center Select / OK / Enter (13 / 23 / 66 / 10009 / GamepadA)
    if (
      key === 'Enter' ||
      key === 'Select' ||
      key === 'GamepadA' ||
      key === 'Ok' ||
      key === 'Accept' ||
      keyCode === 13 ||
      keyCode === 23 ||
      keyCode === 66
    ) {
      e.preventDefault();
      handlers.onSelect?.();
      return;
    }

    // Back / Return / Esc (8 / 27 / 4 / 461 / 10009)
    if (
      key === 'Escape' ||
      key === 'Backspace' ||
      key === 'GoBack' ||
      key === 'BrowserBack' ||
      key === 'GamepadB' ||
      keyCode === 8 ||
      keyCode === 27 ||
      keyCode === 4 ||
      keyCode === 461 ||
      keyCode === 10009
    ) {
      e.preventDefault();
      handlers.onBack?.();
      return;
    }

    // Menu / ContextMenu (82 / 18 / ContextMenu)
    if (key === 'ContextMenu' || key === 'Menu' || keyCode === 82 || keyCode === 93) {
      e.preventDefault();
      handlers.onMenu?.();
      return;
    }

    // Play/Pause (179 / MediaPlayPause / Space)
    if (key === 'MediaPlayPause' || key === ' ' || keyCode === 179 || keyCode === 32 || keyCode === 85) {
      e.preventDefault();
      handlers.onPlayPause?.();
      return;
    }
  }, [handlers, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export interface FocusableItemProps {
  isFocused: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const FocusableItem: React.FC<FocusableItemProps> = ({ isFocused, className = '', children, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`transition-all duration-150 cursor-pointer ${
        isFocused 
          ? 'outline outline-4 outline-blue-500 ring-4 ring-blue-400/40 scale-[1.03] shadow-lg shadow-blue-500/30' 
          : 'opacity-85 hover:opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  );
};
