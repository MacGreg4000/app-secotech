import { render, screen } from '@testing-library/react'
import DashboardPage from './page'

describe('DashboardPage', () => {
  it('renders dashboard', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
  })
}) 