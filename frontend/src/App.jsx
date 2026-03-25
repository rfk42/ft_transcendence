import { BrowserRouter } from 'react-router'
import Header from './Header/Header.jsx'
import Footer from './Footer/Footer.jsx'
import Content from './Content/Content.jsx'

const App = () => (
  <BrowserRouter>
    <Header />
    <Content />
    <Footer />
  </BrowserRouter>
)

export default App
