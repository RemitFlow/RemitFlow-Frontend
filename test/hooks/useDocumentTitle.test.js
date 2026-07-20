import { renderHook } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { useDocumentTitle } from '../../src/hooks/useDocumentTitle.js';

describe('useDocumentTitle', () => {
  afterEach(() => {
    document.title = 'RemitFlow';
  });

  it('sets document.title to "RemitFlow — Home" when given "Home"', () => {
    renderHook(() => useDocumentTitle('Home'));
    expect(document.title).toBe('RemitFlow — Home');
  });

  it('sets document.title to "RemitFlow — Send Money" when given "Send Money"', () => {
    renderHook(() => useDocumentTitle('Send Money'));
    expect(document.title).toBe('RemitFlow — Send Money');
  });

  it('sets document.title to "RemitFlow — Your Transfers" when given "Your Transfers"', () => {
    renderHook(() => useDocumentTitle('Your Transfers'));
    expect(document.title).toBe('RemitFlow — Your Transfers');
  });

  it('sets document.title to "RemitFlow — Page Not Found" when given "Page Not Found"', () => {
    renderHook(() => useDocumentTitle('Page Not Found'));
    expect(document.title).toBe('RemitFlow — Page Not Found');
  });

  it('restores document.title to "RemitFlow" on unmount', () => {
    document.title = 'Other Title';
    const { unmount } = renderHook(() => useDocumentTitle('Home'));
    expect(document.title).toBe('RemitFlow — Home');
    unmount();
    expect(document.title).toBe('RemitFlow');
  });
});
