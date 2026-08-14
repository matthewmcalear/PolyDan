import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PolyDan application', () => {
  render(<App />);
  const heading = screen.getByText(/PolyDan Iron Man Betting/i);
  expect(heading).toBeInTheDocument();
});
