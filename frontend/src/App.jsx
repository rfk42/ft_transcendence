import { BrowserRouter } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import Header from './Header/Header.jsx'
import Footer from './Footer/Footer.jsx'
import Content from './Content/Content.jsx'
import Friends from './Content/Friends/Friends'

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Header />
      <Content />
      <Footer />
    </BrowserRouter>
  </AuthProvider>
)

export default App
