import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

describe('<App />', () => {
  it('renders login screen initially', () => {
    const { getByText } = render(<App />);
    
    // Verifica se o texto "Login" está presente na tela
    expect(getByText('Login')).toBeTruthy();
  });
});
