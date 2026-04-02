import logo42Img from './logo42.png'

const Logo42 = ({ width = 32, height, ...props }) => (
  <img
    src={logo42Img}
    alt="42"
    width={width}
    height={height}
    style={{ display: 'block', objectFit: 'contain' }}
    {...props}
  />
)

export default Logo42
